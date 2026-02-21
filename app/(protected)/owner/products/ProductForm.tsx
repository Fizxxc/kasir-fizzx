"use client";

import { useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import CameraBarcodeScanner from "./CameraBarcodeScanner";

export default function ProductForm() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const scanRef = useRef<HTMLInputElement | null>(null);

  const [scan, setScan] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [unit, setUnit] = useState("pcs");
  const [isActive, setIsActive] = useState(true);

  const [msg, setMsg] = useState<string | null>(null);

  async function loadByBarcode(code: string) {
    const c = code.trim();
    if (!c) return;

    setMsg(null);

    const { data, error } = await sb
      .from("products")
      .select("*")
      .eq("barcode", c)
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }

    if (data) {
      setEditingId(data.id);
      setName(data.name ?? "");
      setBarcode(data.barcode ?? c);
      setPrice(Number(data.price ?? 0));
      setStock(Number(data.stock ?? 0));
      setUnit(data.unit ?? "pcs");
      setIsActive(Boolean(data.is_active));
      setMsg("Produk ditemukan (mode edit).");
    } else {
      setEditingId(null);
      setBarcode(c);
      setMsg("Barcode baru. Isi data lalu simpan.");
    }
  }

  async function save() {
    setMsg(null);
    if (!name.trim()) return setMsg("Nama produk wajib diisi.");
    if (!price || price <= 0) return setMsg("Harga tidak valid.");

    const payload = {
      name: name.trim(),
      barcode: barcode.trim() || null,
      price,
      stock,
      unit,
      is_active: isActive,
    };

    if (editingId) {
      const { error } = await sb.from("products").update(payload).eq("id", editingId);
      if (error) return setMsg(error.message);
      setMsg("Produk berhasil diupdate. Refresh halaman untuk lihat perubahan.");
    } else {
      const { error } = await sb.from("products").insert(payload);
      if (error) return setMsg(error.message);
      setMsg("Produk berhasil ditambah. Refresh halaman untuk lihat perubahan.");
    }

    scanRef.current?.focus();
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setBarcode("");
    setPrice(0);
    setStock(0);
    setUnit("pcs");
    setIsActive(true);
    setMsg(null);
    scanRef.current?.focus();
  }

  return (
    <div className="rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold">Scan / Tambah Produk</div>
          <div className="text-xs text-gray-500">
            Bisa scan dengan scanner USB (keyboard) atau kamera HP.
          </div>
        </div>
        <button
          className="rounded-xl bg-black text-white px-4 py-2"
          onClick={() => setScannerOpen(true)}
        >
          Scan Kamera
        </button>
      </div>

      <div className="flex gap-2">
        <input
          ref={scanRef}
          className="border rounded-xl p-3 flex-1 font-mono"
          placeholder="Scan barcode lalu Enter..."
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") loadByBarcode(scan);
          }}
        />
        <button className="rounded-xl border px-4 py-3" onClick={() => loadByBarcode(scan)}>
          Cari
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          className="border rounded-xl p-3"
          placeholder="Nama produk"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border rounded-xl p-3 font-mono"
          placeholder="Barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
        />
        <input
          className="border rounded-xl p-3"
          type="number"
          placeholder="Harga"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />
        <input
          className="border rounded-xl p-3"
          type="number"
          placeholder="Stok"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
        />
        <input
          className="border rounded-xl p-3"
          placeholder="Unit (pcs/box/dll)"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <label className="flex items-center gap-2 p-3 border rounded-xl">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Aktif
        </label>
      </div>

      {editingId ? (
        <div className="text-xs text-gray-600">
          Mode: <b>Edit</b> • ID: <span className="font-mono">{editingId}</span>
        </div>
      ) : (
        <div className="text-xs text-gray-600">Mode: <b>Tambah baru</b></div>
      )}

      {msg ? <div className="text-sm text-blue-700">{msg}</div> : null}

      <div className="flex gap-2">
        <button className="rounded-xl bg-green-600 text-white px-4 py-3" onClick={save}>
          Simpan
        </button>
        <button className="rounded-xl border px-4 py-3" onClick={resetForm}>
          Reset
        </button>
      </div>

      <CameraBarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code) => {
          // 1) isi input scan & barcode
          setScan(code);
          setBarcode(code);
          // 2) auto search/load produk
          loadByBarcode(code);
        }}
      />
    </div>
  );
}