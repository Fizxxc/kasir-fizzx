-- ============================================================
-- POS UMKM - Supabase SQL (FINAL, idempotent)
-- ============================================================

-- =========================
-- Extensions
-- =========================
create extension if not exists "pgcrypto";   -- for gen_random_uuid()
create extension if not exists "uuid-ossp";  -- optional (keep if you still use it)

-- =========================
-- Role enum
-- =========================
do $$ begin
  create type public.user_role as enum ('owner', 'kasir');
exception when duplicate_object then null;
end $$;

-- =========================
-- Profiles
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.user_role not null default 'kasir',
  created_at timestamptz not null default now()
);

-- =========================
-- Trigger: auto create profile
-- =========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'kasir'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- =========================
-- Products
-- =========================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text,
  barcode text unique,
  name text not null,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock numeric(12,2) not null default 0,
  unit text default 'pcs',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_name_idx
on public.products using gin (to_tsvector('simple', name));

create index if not exists products_barcode_idx
on public.products (barcode);

-- =========================
-- Shifts
-- =========================
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_cash numeric(12,2) not null default 0,
  closing_cash numeric(12,2),
  status text not null default 'open'
);

create index if not exists shifts_cashier_idx on public.shifts(cashier_id);
create index if not exists shifts_status_idx on public.shifts(status);

-- =========================
-- Transactions
-- =========================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid references public.shifts(id) on delete set null,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  change numeric(12,2) not null default 0,
  payment_method text not null default 'cash',
  created_at timestamptz not null default now()
);

create index if not exists tx_cashier_idx on public.transactions(cashier_id);
create index if not exists tx_created_at_idx on public.transactions(created_at);

-- =========================
-- Transaction Items
-- product_id nullable => supports "kalkulator/manual"
-- =========================
create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric(12,2) not null default 0,
  qty numeric(12,2) not null default 1,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tx_items_tx_idx on public.transaction_items(transaction_id);
create index if not exists tx_items_product_idx on public.transaction_items(product_id);

-- =========================
-- Feedback (anon insert allowed)
-- =========================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  name text,
  phone text,
  message text not null,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists feedback_tx_idx on public.feedback(transaction_id);
create index if not exists feedback_created_at_idx on public.feedback(created_at);

-- =========================
-- Helper role function
-- =========================
create or replace function public.has_role(r public.user_role)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = r
  );
$$;

-- =========================
-- RPC: decrease stock (safe)
-- =========================
create or replace function public.decrease_stock(p_id uuid, p_qty numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null then
    raise exception 'p_id is null';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'p_qty invalid';
  end if;

  update public.products
  set stock = stock - p_qty
  where id = p_id;

  -- optional: ensure product exists
  if not found then
    raise exception 'product not found: %', p_id;
  end if;
end;
$$;

grant execute on function public.decrease_stock(uuid, numeric) to authenticated;

-- =========================
-- Enable RLS
-- =========================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.shifts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.feedback enable row level security;

-- =========================
-- RLS Policies
-- =========================

-- -------- profiles
drop policy if exists profiles_read_self_or_owner on public.profiles;
create policy profiles_read_self_or_owner on public.profiles
for select
using (id = auth.uid() or public.has_role('owner'));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());  -- prevent changing row ownership

-- allow owner to update any profile (role assignment)
drop policy if exists profiles_owner_update_all on public.profiles;
create policy profiles_owner_update_all on public.profiles
for update
using (public.has_role('owner'))
with check (public.has_role('owner'));

-- -------- products
drop policy if exists products_read_all_authed on public.products;
create policy products_read_all_authed on public.products
for select
using (auth.uid() is not null);

drop policy if exists products_owner_manage on public.products;
create policy products_owner_manage on public.products
for all
using (public.has_role('owner'))
with check (public.has_role('owner'));

-- -------- shifts
drop policy if exists shifts_read_own_or_owner on public.shifts;
create policy shifts_read_own_or_owner on public.shifts
for select
using (cashier_id = auth.uid() or public.has_role('owner'));

drop policy if exists shifts_insert_own_or_owner on public.shifts;
create policy shifts_insert_own_or_owner on public.shifts
for insert
with check (cashier_id = auth.uid() or public.has_role('owner'));

drop policy if exists shifts_update_own_or_owner on public.shifts;
create policy shifts_update_own_or_owner on public.shifts
for update
using (cashier_id = auth.uid() or public.has_role('owner'))
with check (cashier_id = auth.uid() or public.has_role('owner'));

-- -------- transactions
drop policy if exists tx_read_own_or_owner on public.transactions;
create policy tx_read_own_or_owner on public.transactions
for select
using (cashier_id = auth.uid() or public.has_role('owner'));

drop policy if exists tx_insert_own_or_owner on public.transactions;
create policy tx_insert_own_or_owner on public.transactions
for insert
with check (cashier_id = auth.uid() or public.has_role('owner'));

-- optional: allow cashier to update their own tx (if you ever need)
drop policy if exists tx_update_own_or_owner on public.transactions;
create policy tx_update_own_or_owner on public.transactions
for update
using (cashier_id = auth.uid() or public.has_role('owner'))
with check (cashier_id = auth.uid() or public.has_role('owner'));

-- -------- transaction_items
drop policy if exists items_read_owner_or_own_tx on public.transaction_items;
create policy items_read_owner_or_own_tx on public.transaction_items
for select
using (
  public.has_role('owner')
  or exists (
    select 1
    from public.transactions t
    where t.id = transaction_id
      and t.cashier_id = auth.uid()
  )
);

drop policy if exists items_insert_owner_or_own_tx on public.transaction_items;
create policy items_insert_owner_or_own_tx on public.transaction_items
for insert
with check (
  public.has_role('owner')
  or exists (
    select 1
    from public.transactions t
    where t.id = transaction_id
      and t.cashier_id = auth.uid()
  )
);

-- optional update/delete (if you later need editing items)
drop policy if exists items_delete_owner_or_own_tx on public.transaction_items;
create policy items_delete_owner_or_own_tx on public.transaction_items
for delete
using (
  public.has_role('owner')
  or exists (
    select 1
    from public.transactions t
    where t.id = transaction_id
      and t.cashier_id = auth.uid()
  )
);

-- -------- feedback
drop policy if exists feedback_anon_insert on public.feedback;
create policy feedback_anon_insert on public.feedback
for insert
to anon, authenticated
with check (true);

drop policy if exists feedback_owner_read on public.feedback;
create policy feedback_owner_read on public.feedback
for select
using (public.has_role('owner'));