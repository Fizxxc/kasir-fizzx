"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function FeedbackClient() {
  const sp = useSearchParams();
  const tx = sp.get("tx"); // optional
  const sb = supabaseBrowser();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);

    if (!message.trim()) {
      setErr("Pesan tidak boleh kosong.");
      return;
    }

    const { error } = await sb.from("feedback").insert({
      transaction_id: tx,
      name: name || null,
      phone: phone || null,
      rating,
      message,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border p-6 max-w-md w-full text-center space-y-2">
          <div className="text-xl font-semibold">Terima kasih!</div>
          <div className="text-gray-600">Masukan kamu sudah tersimpan.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto space-y-3">
      <h1 className="text-xl font-semibold">Saran & Kritik</h1>
      <p className="text-sm text-gray-600">
        Terima kasih sudah berbelanja. Silakan tulis masukan agar kami lebih baik.
      </p>

      <input
        className="w-full border rounded-xl p-3"
        placeholder="Nama (opsional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full border rounded-xl p-3"
        placeholder="No HP (opsional)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <div className="flex items-center gap-3">
        <span>Rating:</span>
        <input
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="border rounded-xl p-2 w-20"
        />
      </div>

      <textarea
        className="w-full border rounded-xl p-3"
        placeholder="Tulis masukan..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {err && <div className="text-sm text-red-600">{err}</div>}

      <button className="w-full rounded-xl bg-black text-white p-3" onClick={submit}>
        Kirim
      </button>

      {tx && <div className="text-xs text-gray-500">Ref transaksi: {tx}</div>}
    </div>
  );
}