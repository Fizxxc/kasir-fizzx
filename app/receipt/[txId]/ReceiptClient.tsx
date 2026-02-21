"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type TxItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  line_total: number;
};

type Tx = {
  id: string;
  created_at: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  payment_method: string;
  transaction_items: TxItem[];
};

function rupiah(n: number) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

export default function ReceiptClient({ txId }: { txId: string }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const feedbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/feedback?tx=${txId}`;
  }, [txId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (!txId || txId === "undefined") {
          setErr("txId tidak valid (undefined).");
          setTx(null);
          return;
        }

        const { data, error } = await sb
          .from("transactions")
          .select(
            "id,created_at,subtotal,discount,tax,total,paid,change,payment_method,transaction_items(id,name,price,qty,line_total)"
          )
          .eq("id", txId)
          .single();

        if (!alive) return;

        if (error) {
          setErr(error.message);
          setTx(null);
          return;
        }

        setTx(data as any);

        const QRCode = (await import("qrcode")).default;
        const qr = await QRCode.toDataURL(feedbackUrl, { margin: 1, width: 180 });
        if (!alive) return;
        setQrDataUrl(qr);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Unknown error");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [sb, txId, feedbackUrl]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700 }}>Gagal memuat struk</div>
        <div style={{ marginTop: 8, color: "crimson" }}>{err}</div>
      </div>
    );
  }

  if (!tx) return <div style={{ padding: 16 }}>Struk tidak ditemukan</div>;

  return (
    <div>
      <style>{`
        @page { size: 58mm auto; margin: 0; }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        body {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        }
        .paper { width: 58mm; padding: 8px; }
        .center { text-align: center; }
        .row { display: flex; justify-content: space-between; gap: 8px; }
        .muted { color: #333; font-size: 12px; }
        .hr { border-top: 1px dashed #000; margin: 6px 0; }
        img.logo { max-width: 46mm; height: auto; }
        .btn { margin-top: 10px; width: 58mm; padding: 10px; border-radius: 10px; border: 1px solid #ddd; background: #000; color: #fff; }
      `}</style>

      <div className="paper">
        <div className="center">
          <img className="logo" src="/logo.png" alt="Logo" />
          <div style={{ fontWeight: 700, marginTop: 4 }}>TOKO UMKM</div>
          <div className="muted">Terima kasih 🙏</div>
        </div>

        <div className="hr" />

        <div className="muted">No: {tx.id}</div>
        <div className="muted">Waktu: {new Date(tx.created_at).toLocaleString("id-ID")}</div>
        <div className="muted">Metode: {String(tx.payment_method).toUpperCase()}</div>

        <div className="hr" />

        {tx.transaction_items?.map((it) => (
          <div key={it.id} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 13 }}>{it.name}</div>
            <div className="row muted">
              <span>
                {Number(it.qty)} x {rupiah(Number(it.price))}
              </span>
              <span>{rupiah(Number(it.line_total))}</span>
            </div>
          </div>
        ))}

        <div className="hr" />
        <div className="row"><span>Subtotal</span><span>{rupiah(Number(tx.subtotal))}</span></div>
        <div className="row"><span>Diskon</span><span>- {rupiah(Number(tx.discount))}</span></div>
        <div className="row"><span>Pajak</span><span>{rupiah(Number(tx.tax))}</span></div>
        <div className="row" style={{ fontWeight: 800 }}><span>Total</span><span>{rupiah(Number(tx.total))}</span></div>
        <div className="hr" />
        <div className="row"><span>Bayar</span><span>{rupiah(Number(tx.paid))}</span></div>
        <div className="row"><span>Kembali</span><span>{rupiah(Number(tx.change))}</span></div>

        <div className="hr" />
        <div className="center muted">Saran & Kritik</div>
        <div className="center" style={{ marginTop: 6 }}>
          {qrDataUrl ? <img src={qrDataUrl} alt="QR" /> : null}
        </div>

        <button className="btn no-print" onClick={() => window.print()}>
          Print Struk
        </button>
      </div>
    </div>
  );
}