"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { createPosBus, DisplayItem, DisplayState } from "@/lib/pos-bus";

type Shift = {
  id: string;
  status: string;
  opened_at: string;
  opening_cash: number;
};

function money(n: number) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export default function PosKalkulatorPage() {
  const sb = supabaseBrowser();
  const bus = useMemo(() => createPosBus(), []);
  const nameRef = useRef<HTMLInputElement | null>(null);

  // shift
  const [shift, setShift] = useState<Shift | null>(null);
  const [openingCash, setOpeningCash] = useState(0);

  // manual input
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemQty, setItemQty] = useState<number>(1);

  // cart
  const [items, setItems] = useState<DisplayItem[]>([]);
  const subtotal = useMemo(() => items.reduce((a, b) => a + b.lineTotal, 0), [items]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const total = useMemo(() => Math.max(0, subtotal - discount + tax), [subtotal, discount, tax]);

  // payment
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "debit">("cash");
  const [paid, setPaid] = useState(0);
  const change = useMemo(() => Math.max(0, paid - total), [paid, total]);

  // qris
  const QRIS_BASE = process.env.NEXT_PUBLIC_QRIS_BASE?.trim() ?? "";
  const [qrisPayload, setQrisPayload] = useState<string | undefined>();
  const [qrisDataUrl, setQrisDataUrl] = useState<string | undefined>();
  const [qrisLoading, setQrisLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getUser();
      if (!data.user) return;
      await loadOpenShift();
      nameRef.current?.focus();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const st: DisplayState = {
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
    bus.send(st);
  }, [items, subtotal, discount, tax, total, paymentMethod, paid, change, qrisPayload, qrisDataUrl, bus]);

  async function loadOpenShift() {
    const { data } = await sb
      .from("shifts")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
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

  function openCustomerDisplay() {
    window.open("/display", "customer_display", "popup,width=900,height=700")?.focus();
  }

  function addManual() {
    if (!shift) return alert("Shift belum dibuka.");
    if (!itemName.trim()) return alert("Nama item kosong.");
    const price = Number(itemPrice);
    const qty = Number(itemQty);
    if (!Number.isFinite(price) || price <= 0) return alert("Harga tidak valid.");
    if (!Number.isFinite(qty) || qty <= 0) return alert("Qty tidak valid.");

    const id = `manual_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    setItems((prev) => [
      { id, name: itemName.trim(), price, qty, lineTotal: price * qty },
      ...prev,
    ]);

    setItemName("");
    setItemPrice(0);
    setItemQty(1);
    nameRef.current?.focus();
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
    if (!shift) return alert("Shift belum dibuka.");
    if (items.length === 0) return alert("Keranjang kosong.");
    if (!QRIS_BASE) return alert("QRIS base belum diset (NEXT_PUBLIC_QRIS_BASE).");

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
    if (!shift) return alert("Shift belum dibuka.");
    if (items.length === 0) return alert("Keranjang kosong.");
    setPaymentMethod("debit");
    setPaid(total);
    setQrisPayload(undefined);
    setQrisDataUrl(undefined);
  }

  async function checkout() {
    if (!shift) return alert("Shift belum dibuka.");
    if (items.length === 0) return alert("Keranjang kosong.");

    if (paymentMethod === "cash" && paid < total) return alert("Uang bayar kurang.");
    if (paymentMethod !== "cash") setPaid(total);

    const { data: u } = await sb.auth.getUser();
    if (!u.user) return alert("Belum login");

    const paidFinal = paymentMethod === "cash" ? paid : total;
    const changeFinal = paymentMethod === "cash" ? Math.max(0, paid - total) : 0;

    // transaksi
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

    // items: product_id NULL (manual)
    const rows = items.map((it) => ({
      transaction_id: (tx as any).id,
      product_id: null,
      name: it.name,
      price: it.price,
      qty: it.qty,
      line_total: it.lineTotal,
    }));

    const { error: itemErr } = await sb.from("transaction_items").insert(rows);
    if (itemErr) return alert(itemErr.message);

    setItems([]);
    setDiscount(0);
    setTax(0);
    resetPaymentToCash();

    window.open(`/receipt/${(tx as any).id}`, "_blank")?.focus();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">POS Kalkulator (Tanpa Produk)</h1>
          <div className="text-sm text-gray-600">Input manual nama + harga, tetap support QRIS & display.</div>
        </div>

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
          <div className="font-semibold">Buka Shift</div>
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
        </div>
      ) : (
        <div className="rounded-2xl border p-4 text-sm text-gray-700">
          Shift: <b>OPEN</b> • Dibuka: {new Date(shift.opened_at).toLocaleString("id-ID")} • Kas awal:{" "}
          <b>{money(Number(shift.opening_cash || 0))}</b>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Input manual */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-semibold">Tambah Item Manual</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                ref={nameRef}
                className="border rounded-xl p-3 md:col-span-2"
                placeholder="Nama item (contoh: Jasa / Barang)"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
              />
              <input
                className="border rounded-xl p-3"
                type="number"
                placeholder="Harga"
                value={itemPrice}
                onChange={(e) => setItemPrice(Number(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
              />
              <input
                className="border rounded-xl p-3"
                type="number"
                placeholder="Qty"
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
              />
            </div>
            <button className="rounded-xl bg-black text-white px-4 py-3" onClick={addManual}>
              Tambah
            </button>
          </div>
        </div>

        {/* Cart */}
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
                <input className="border rounded-lg p-2 w-32 text-right" type="number" value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Pajak</span>
                <input className="border rounded-lg p-2 w-32 text-right" type="number" value={tax}
                  onChange={(e) => setTax(Number(e.target.value))} />
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
                    <input className="border rounded-lg p-2 w-40 text-right" type="number" value={paid}
                      onChange={(e) => setPaid(Number(e.target.value))} />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}