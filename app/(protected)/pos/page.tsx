"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createPosBus, DisplayItem, DisplayState } from "@/lib/pos-bus";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  unit: string | null;
  is_active: boolean;
};

type Shift = {
  id: string;
  status: string;
  opened_at: string;
  opening_cash: number;
};

function money(n: number) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

function isUuid(v: unknown) {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function PosPage() {
  const sb = supabaseBrowser();
  const bus = useMemo(() => createPosBus(), []);
  const barcodeRef = useRef<HTMLInputElement | null>(null);

  // ===== Shift
  const [shift, setShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState(0);

  // ===== Search
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  // ===== Cart
  const [items, setItems] = useState<DisplayItem[]>([]);
  const subtotal = useMemo(() => items.reduce((a, b) => a + b.lineTotal, 0), [items]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const total = useMemo(() => Math.max(0, subtotal - discount + tax), [subtotal, discount, tax]);

  // ===== Payment
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "debit">("cash");
  const [paid, setPaid] = useState(0);
  const change = useMemo(() => Math.max(0, paid - total), [paid, total]);

  // ===== QRIS
  const QRIS_BASE = process.env.NEXT_PUBLIC_QRIS_BASE?.trim() ?? "";
  const [qrisPayload, setQrisPayload] = useState<string | undefined>(undefined);
  const [qrisDataUrl, setQrisDataUrl] = useState<string | undefined>(undefined);
  const [qrisLoading, setQrisLoading] = useState(false);

  // ===== init
  useEffect(() => {
    (async () => {
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return;

      await loadOpenShift();
      barcodeRef.current?.focus();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== broadcast to monitor 2
  useEffect(() => {
    const state: DisplayState = {
      items,
      subtotal,
      discount,
      tax,
      total,
      paymentMethod,
      paid,
      change,
      qrisPayload,
      qrisDataUrl,
    };
    bus.send(state);
  }, [items, subtotal, discount, tax, total, paymentMethod, paid, change, qrisPayload, qrisDataUrl, bus]);

  async function loadOpenShift() {
    const { data, error } = await sb
      .from("shifts")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) console.error(error);
    setShift((data as any) ?? null);
  }

  async function openShift() {
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return alert("Belum login");

    const { error } = await sb.from("shifts").insert({
      cashier_id: u.user.id,
      opening_cash: openingCash,
      status: "open",
    });

    if (error) return alert(error.message);
    await loadOpenShift();
  }

  async function closeShift() {
    if (!shift) return;
    const closingCash = prompt("Masukkan kas akhir (angka) :", "0");
    const val = Number(closingCash || 0);

    const { error } = await sb
      .from("shifts")
      .update({ status: "closed", closed_at: new Date().toISOString(), closing_cash: val })
      .eq("id", shift.id);

    if (error) return alert(error.message);
    setShift(null);
  }

  async function searchProducts(keyword: string) {
    setQ(keyword);
    if (!keyword.trim()) {
      setProducts([]);
      return;
    }

    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("is_active", true)
      .or(`name.ilike.%${keyword}%,barcode.eq.${keyword}`)
      .limit(20);

    if (error) console.error(error);
    setProducts(((data as any) ?? []) as Product[]);
  }

  function addToCart(p: Product) {
    // ✅ hard guard: product must have uuid id
    if (!isUuid(p.id)) {
      alert("Produk tidak valid (id kosong). Cek data products di Supabase.");
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = [...prev];
        const it = next[idx];
        const qty = it.qty + 1;
        next[idx] = { ...it, qty, lineTotal: qty * it.price };
        return next;
      }
      return [
        { id: p.id, name: p.name, price: Number(p.price), qty: 1, lineTotal: Number(p.price) },
        ...prev,
      ];
    });
  }

  function updateQty(id: string, qty: number) {
    const q = Number(qty);
    setItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, qty: q, lineTotal: q * it.price } : it))
        .filter((it) => it.qty > 0)
    );
  }

  function resetPaymentToCash() {
    setPaymentMethod("cash");
    setPaid(0);
    setQrisPayload(undefined);
    setQrisDataUrl(undefined);
  }

  async function startQris() {
    if (!shift) return alert("Shift belum dibuka. Klik Buka Shift dulu.");
    if (items.length === 0) return alert("Keranjang kosong.");
    if (!QRIS_BASE) return alert("QRIS base belum diset. Isi NEXT_PUBLIC_QRIS_BASE di .env");

    try {
      setQrisLoading(true);
      setPaymentMethod("qris");
      setPaid(total);

      const res = await fetch("/api/qris", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseQris: QRIS_BASE, amount: total }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        alert(data?.error ?? "Gagal generate QRIS");
        resetPaymentToCash();
        return;
      }

      setQrisPayload(data.payload);
      setQrisDataUrl(data.qrDataUrl);
    } finally {
      setQrisLoading(false);
    }
  }

  function setDebit() {
    if (!shift) return alert("Shift belum dibuka. Klik Buka Shift dulu.");
    if (items.length === 0) return alert("Keranjang kosong.");
    setPaymentMethod("debit");
    setPaid(total);
    setQrisPayload(undefined);
    setQrisDataUrl(undefined);
  }

  function openCustomerDisplay() {
    const w = window.open("/display", "customer_display", "popup,width=900,height=700");
    w?.focus();
  }

  async function onBarcodeEnter(value: string) {
    const code = value.trim();
    if (!code) return;

    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("barcode", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) console.error(error);

    if (!data) {
      alert("Barcode tidak ditemukan");
      return;
    }
    addToCart(data as any);
  }

  async function checkout() {
    if (!shift) return alert("Shift belum dibuka. Klik Buka Shift dulu.");
    if (items.length === 0) return alert("Keranjang kosong.");

    // ✅ validate cart items: must have valid uuid
    const invalid = items.find((it) => !isUuid(it.id));
    if (invalid) {
      alert(`Item rusak: "${invalid.name}" (id tidak valid). Hapus item itu lalu coba lagi.`);
      return;
    }

    if (paymentMethod === "cash") {
      if (paid < total) return alert("Uang bayar kurang.");
    } else {
      if (total <= 0) return alert("Total tidak valid.");
      setPaid(total);
    }

    const { data: u } = await sb.auth.getUser();
    if (!u.user) return alert("Belum login");

    const paidFinal = paymentMethod === "cash" ? paid : total;
    const changeFinal = paymentMethod === "cash" ? Math.max(0, paid - total) : 0;

    // insert transaction
    const { data: tx, error: txErr } = await sb
      .from("transactions")
      .insert({
        cashier_id: u.user.id,
        shift_id: shift.id,
        subtotal,
        discount,
        tax,
        total,
        paid: paidFinal,
        change: changeFinal,
        payment_method: paymentMethod,
      })
      .select("*")
      .single();

    if (txErr) return alert(txErr.message);

    // insert items
    const rows = items.map((it) => ({
      transaction_id: (tx as any).id,
      product_id: it.id, // now guaranteed uuid
      name: it.name,
      price: it.price,
      qty: it.qty,
      line_total: it.lineTotal,
    }));

    const { error: itemErr } = await sb.from("transaction_items").insert(rows);
    if (itemErr) return alert(itemErr.message);

    // decrease stock via RPC (only for valid ids)
    await Promise.all(
      items.map(async (it) => {
        const { error } = await sb.rpc("decrease_stock", { p_id: it.id, p_qty: it.qty });
        if (error) console.warn("decrease_stock failed:", error.message);
      })
    );

    // reset cart
    setItems([]);
    setDiscount(0);
    setTax(0);
    resetPaymentToCash();

    // open receipt
    window.open(`/receipt/${(tx as any).id}`, "_blank")?.focus();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">POS</h1>
        <div className="flex gap-2">
          <button className="rounded-xl border px-3 py-2" onClick={openCustomerDisplay}>
            Monitor 2 (Customer)
          </button>
          {shift ? (
            <button className="rounded-xl bg-red-600 text-white px-3 py-2" onClick={closeShift}>
              Tutup Shift
            </button>
          ) : null}
        </div>
      </div>

      {!shift ? (
        <div className="rounded-2xl border p-4 space-y-3">
          <div className="font-semibold">Buka Shift (wajib sebelum transaksi)</div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="border rounded-xl p-3 w-64"
              type="number"
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value))}
              placeholder="Uang kas awal"
            />
            <button className="rounded-xl bg-black text-white px-4 py-3" onClick={openShift}>
              Buka Shift
            </button>
          </div>
          <p className="text-sm text-gray-600">Kasir harus login dan membuka shift dulu untuk mulai jualan.</p>
        </div>
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-gray-700">
          Shift: <b>OPEN</b> • Dibuka: {new Date(shift.opened_at).toLocaleString("id-ID")} • Kas awal:{" "}
          <b>{money(Number(shift.opening_cash || 0))}</b>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={barcodeRef}
                className="border rounded-xl p-3 flex-1 min-w-[240px]"
                placeholder="Scan barcode lalu Enter..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value;
                    (e.target as HTMLInputElement).value = "";
                    onBarcodeEnter(v);
                  }
                }}
              />
              <input
                className="border rounded-xl p-3 flex-1 min-w-[240px]"
                placeholder="Cari nama produk..."
                value={q}
                onChange={(e) => searchProducts(e.target.value)}
              />
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="text-left rounded-xl border p-3 hover:bg-gray-50"
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-gray-600 flex justify-between">
                      <span>{money(Number(p.price))}</span>
                      <span>
                        Stok: {Number(p.stock)} {p.unit ?? ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Cari produk atau scan barcode.</div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-3">
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-semibold">Keranjang</div>

            <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
              {items.length === 0 ? (
                <div className="text-sm text-gray-500">Belum ada item.</div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="rounded-xl border p-3">
                    <div className="font-medium truncate">{it.name}</div>
                    <div className="text-sm text-gray-600 flex justify-between">
                      <span>{money(it.price)}</span>
                      <span>{money(it.lineTotal)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="rounded-lg border px-2 py-1" onClick={() => updateQty(it.id, it.qty - 1)}>
                        -
                      </button>
                      <input
                        className="border rounded-lg p-2 w-20 text-center"
                        type="number"
                        value={it.qty}
                        onChange={(e) => updateQty(it.id, Number(e.target.value))}
                      />
                      <button className="rounded-lg border px-2 py-1" onClick={() => updateQty(it.id, it.qty + 1)}>
                        +
                      </button>
                      <button className="ml-auto text-sm text-red-600" onClick={() => updateQty(it.id, 0)}>
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <b>{money(subtotal)}</b>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Diskon</span>
                <input
                  className="border rounded-lg p-2 w-32 text-right"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Pajak</span>
                <input
                  className="border rounded-lg p-2 w-32 text-right"
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-between text-base">
                <span>Total</span>
                <b>{money(total)}</b>
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="text-sm text-gray-700">
                Metode: <b>{paymentMethod.toUpperCase()}</b>
              </div>

              {paymentMethod === "cash" ? (
                <>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm">Bayar</span>
                    <input
                      className="border rounded-lg p-2 w-40 text-right"
                      type="number"
                      value={paid}
                      onChange={(e) => setPaid(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Kembali</span>
                    <b>{money(change)}</b>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border p-3 text-sm bg-gray-50">
                  <div className="flex justify-between">
                    <span>Nominal</span>
                    <b>{money(total)}</b>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {paymentMethod === "qris"
                      ? "Pelanggan scan QRIS di monitor 2 (nominal otomatis)."
                      : "Debit dianggap pas total (tanpa kembali)."}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`rounded-xl px-3 py-2 ${paymentMethod === "cash" ? "bg-black text-white" : "border"}`}
                  onClick={resetPaymentToCash}
                >
                  CASH
                </button>

                <button
                  className={`rounded-xl px-3 py-2 ${paymentMethod === "qris" ? "bg-black text-white" : "border"}`}
                  onClick={startQris}
                  disabled={qrisLoading}
                  title={!QRIS_BASE ? "Isi NEXT_PUBLIC_QRIS_BASE di .env" : ""}
                >
                  {qrisLoading ? "QRIS..." : "QRIS"}
                </button>

                <button
                  className={`rounded-xl px-3 py-2 ${paymentMethod === "debit" ? "bg-black text-white" : "border"}`}
                  onClick={setDebit}
                >
                  DEBIT
                </button>
              </div>

              <button
                className="w-full rounded-xl bg-green-600 text-white px-3 py-3 font-semibold disabled:opacity-60"
                onClick={checkout}
                disabled={!shift || items.length === 0 || (paymentMethod === "cash" && paid < total)}
              >
                SELESAIKAN (Simpan + Cetak Struk)
              </button>

              {items.some((it) => !isUuid(it.id)) ? (
                <div className="text-xs text-red-600">
                  Ada item dengan ID tidak valid. Hapus item tersebut dulu.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border p-4 text-xs text-gray-600">
            Tips: gunakan barcode scanner (keyboard wedge). Scan → otomatis masuk input barcode lalu Enter.
          </div>
        </div>
      </div>
    </div>
  );
}