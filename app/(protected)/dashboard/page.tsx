import { supabaseServer } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

function money(n: number) {
  return "Rp " + (n || 0).toLocaleString("id-ID");
}

export default async function DashboardPage() {
  const sb = await supabaseServer();
  const { user } = await getSessionProfile();
  if (!user) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { data: txs } = await sb
    .from("transactions")
    .select("*")
    .eq("cashier_id", user.id)
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: false });

  const total = (txs ?? []).reduce((a, b: any) => a + Number(b.total || 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard Kasir</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-600">Omzet Hari Ini</div>
          <div className="text-2xl font-bold">{money(total)}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-600">Transaksi Hari Ini</div>
          <div className="text-2xl font-bold">{(txs ?? []).length}</div>
        </div>
        <div className="rounded-2xl border p-4">
          <div className="text-sm text-gray-600">Quick</div>
          <a className="inline-block mt-2 rounded-xl bg-black text-white px-4 py-2" href="/pos">Buka POS</a>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="font-semibold mb-2">Riwayat Transaksi</div>
        <div className="space-y-2">
          {(txs ?? []).slice(0, 20).map((t: any) => (
            <div key={t.id} className="flex justify-between text-sm border rounded-xl p-3">
              <div>
                <div className="font-medium">{t.payment_method.toUpperCase()} • {new Date(t.created_at).toLocaleString("id-ID")}</div>
                <div className="text-gray-600">ID: {t.id}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{money(Number(t.total))}</div>
                <a className="text-blue-600" href={`/receipt/${t.id}`} target="_blank">Reprint</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}