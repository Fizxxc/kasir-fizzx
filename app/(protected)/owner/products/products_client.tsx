"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  stock: number;
  unit: string | null;
  is_active: boolean;
};

function money(n: number) {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export default function ProductsClient({ initial }: { initial: Product[] }) {
  const sb = supabaseBrowser();
  const [list, setList] = useState<Product[]>(initial);

  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return list;
    return list.filter((p) =>
      [p.name, p.sku ?? "", p.barcode ?? ""].join(" ").toLowerCase().includes(f)
    );
  }, [list, filter]);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    price: 0,
    cost: 0,
    stock: 0,
    unit: "pcs",
    is_active: true,
  });

  async function reload() {
    const { data } = await sb.from("products").select("*").order("created_at", { ascending: false }).limit(200);
    setList((data ?? []) as any);
  }

  async function createProduct() {
    if (!form.name.trim()) return alert("Nama wajib");
    const { error } = await sb.from("products").insert({
      name: form.name,
      sku: form.sku || null,
      barcode: form.barcode || null,
      price: form.price,
      cost: form.cost,
      stock: form.stock,
      unit: form.unit || "pcs",
      is_active: form.is_active,
    });
    if (error) return alert(error.message);
    setForm({ name: "", sku: "", barcode: "", price: 0, cost: 0, stock: 0, unit: "pcs", is_active: true });
    await reload();
  }

  async function updateProduct(id: string, patch: Partial<Product>) {
    const { error } = await sb.from("products").update(patch).eq("id", id);
    if (error) return alert(error.message);
    await reload();
  }

  async function adjustStock(id: string, delta: number) {
    const val = prompt(`Penyesuaian stok (contoh: 5 atau -3). Delta sekarang: ${delta}`, String(delta));
    const d = Number(val || 0);
    if (!Number.isFinite(d)) return;

    // ambil stok sekarang
    const p = list.find((x) => x.id === id);
    const next = Number(p?.stock || 0) + d;

    const { error } = await sb.from("products").update({ stock: next }).eq("id", id);
    if (error) return alert(error.message);
    await reload();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Produk & Stok</h1>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="font-semibold">Tambah Produk</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input className="border rounded-xl p-3" placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded-xl p-3" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="border rounded-xl p-3" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <input className="border rounded-xl p-3" type="number" placeholder="Harga jual" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input className="border rounded-xl p-3" type="number" placeholder="HPP (cost)" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
          <input className="border rounded-xl p-3" type="number" placeholder="Stok awal" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          <input className="border rounded-xl p-3" placeholder="Unit (pcs/kg)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Aktif
          </label>
        </div>
        <button className="rounded-xl bg-black text-white px-4 py-3" onClick={createProduct}>
          Simpan
        </button>
      </div>

      <div className="rounded-2xl border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">Daftar Produk</div>
          <input className="border rounded-xl p-3 w-72" placeholder="Filter nama/SKU/barcode" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>

        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="p-2">Nama</th>
                <th className="p-2">Barcode</th>
                <th className="p-2">Harga</th>
                <th className="p-2">HPP</th>
                <th className="p-2">Stok</th>
                <th className="p-2">Aktif</th>
                <th className="p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2">{p.barcode ?? "-"}</td>
                  <td className="p-2">{money(Number(p.price))}</td>
                  <td className="p-2">{money(Number(p.cost))}</td>
                  <td className="p-2">{Number(p.stock)} {p.unit ?? ""}</td>
                  <td className="p-2">{p.is_active ? "Ya" : "Tidak"}</td>
                  <td className="p-2 flex flex-wrap gap-2">
                    <button className="rounded-lg border px-3 py-1" onClick={() => adjustStock(p.id, 0)}>
                      Adjust Stok
                    </button>
                    <button
                      className="rounded-lg border px-3 py-1"
                      onClick={() => {
                        const v = prompt("Update harga (angka):", String(p.price));
                        const n = Number(v || p.price);
                        updateProduct(p.id, { price: n });
                      }}
                    >
                      Ubah Harga
                    </button>
                    <button
                      className="rounded-lg border px-3 py-1"
                      onClick={() => updateProduct(p.id, { is_active: !p.is_active })}
                    >
                      {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={7}>Kosong.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}