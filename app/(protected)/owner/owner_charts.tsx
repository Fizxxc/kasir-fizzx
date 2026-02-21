"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

function toDateKey(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export default function OwnerCharts({ txs }: { txs: Array<{ total: number; created_at: string; payment_method: string }> }) {
  // Group omzet per hari (7 hari)
  const map = new Map<string, number>();
  for (const t of txs) {
    const key = toDateKey(t.created_at);
    map.set(key, (map.get(key) ?? 0) + Number(t.total || 0));
  }
  const daily = Array.from(map.entries()).map(([date, omzet]) => ({ date, omzet }));

  // Payment mix
  const pm = new Map<string, number>();
  for (const t of txs) {
    const k = (t.payment_method || "cash").toUpperCase();
    pm.set(k, (pm.get(k) ?? 0) + Number(t.total || 0));
  }
  const mix = Array.from(pm.entries()).map(([method, total]) => ({ method, total }));

  const sum = txs.reduce((a, b) => a + Number(b.total || 0), 0);
  const count = txs.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="rounded-2xl border p-4">
        <div className="text-sm text-gray-600">Omzet 7 Hari</div>
        <div className="text-2xl font-bold">Rp {sum.toLocaleString("id-ID")}</div>
        <div className="text-sm text-gray-600 mt-1">Jumlah transaksi: {count}</div>
      </div>

      <div className="rounded-2xl border p-4 lg:col-span-2">
        <div className="font-semibold mb-2">Trend Omzet Harian</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="omzet" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border p-4 lg:col-span-3">
        <div className="font-semibold mb-2">Komposisi Pembayaran</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={mix}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}