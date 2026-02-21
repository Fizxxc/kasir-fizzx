"use client";

import { useEffect, useState } from "react";
import { createPosBus, DisplayState } from "@/lib/pos-bus";

export default function DisplayPage() {
  const [state, setState] = useState<DisplayState>({
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    paymentMethod: "cash",
    paid: 0,
    change: 0,
  });

  useEffect(() => {
    const bus = createPosBus();
    const off = bus.on(setState);
    document.documentElement.requestFullscreen?.().catch(() => { });
    return () => off();
  }, []);

  const isQris = state.paymentMethod === "qris" && state.qrisDataUrl;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">TOTAL</h1>
          <div className="text-white/70 text-sm mt-1">
            Metode: <b className="text-white">{(state.paymentMethod ?? "cash").toUpperCase()}</b>
          </div>
        </div>

        <div className="text-6xl font-extrabold">
          Rp {state.total.toLocaleString("id-ID")}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white/10 p-6">
          <div className="grid grid-cols-12 text-white/70 pb-2 border-b border-white/10">
            <div className="col-span-7">Item</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-3 text-right">Jumlah</div>
          </div>

          <div className="space-y-3 mt-3">
            {state.items.slice(0, 12).map((it) => (
              <div key={it.id} className="grid grid-cols-12">
                <div className="col-span-7 truncate">{it.name}</div>
                <div className="col-span-2 text-right">{it.qty}</div>
                <div className="col-span-3 text-right">
                  Rp {it.lineTotal.toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-white/10 pt-4 space-y-1 text-white/80">
            <div className="flex justify-between"><span>Subtotal</span><span>Rp {state.subtotal.toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span>Diskon</span><span>- Rp {state.discount.toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between"><span>Pajak</span><span>Rp {state.tax.toLocaleString("id-ID")}</span></div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-6 flex flex-col items-center justify-center">
          {!isQris ? (
            <div className="text-center space-y-2">
              <div className="text-white/70">Silakan bayar</div>
              <div className="text-2xl font-bold">Rp {state.total.toLocaleString("id-ID")}</div>
              <div className="text-white/70 text-sm">
                Bayar: Rp {(state.paid ?? 0).toLocaleString("id-ID")} • Kembali: Rp {(state.change ?? 0).toLocaleString("id-ID")}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-xl font-bold">SCAN QRIS</div>
              <div className="text-white/70 text-sm">Nominal otomatis sesuai total</div>
              <img
                src={state.qrisDataUrl}
                alt="QRIS"
                className="rounded-xl bg-white p-3"
              />
                <div className="pt-6 text-xs opacity-70">
                <div>{new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                <div>{new Date().toLocaleTimeString("id-ID")}</div>
                © {new Date().getFullYear()} titiktemu production • Visual Nusantara
                </div>
              {/* <div className="text-white/70 text-xs break-all">
                {state.qrisPayload?.slice(0, 80)}...
              </div> */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}