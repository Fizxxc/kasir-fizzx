import { getSessionProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import OwnerCharts from "./owner_charts";

export default async function OwnerPage() {
  const { profile } = await getSessionProfile();
  if (profile?.role !== "owner") return <div>Akses ditolak. (Owner only)</div>;

  const sb = await supabaseServer();

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const { data: txs } = await sb
    .from("transactions")
    .select("id,total,created_at,payment_method")
    .gte("created_at", start.toISOString())
    .order("created_at", { ascending: true });

  const { data: lowStock } = await sb
    .from("products")
    .select("id,name,stock,unit,price")
    .lte("stock", 5)
    .order("stock", { ascending: true })
    .limit(10);

  const { data: fb } = await sb
    .from("feedback")
    .select("id,name,phone,message,rating,created_at,transaction_id")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Owner Dashboard</h1>

      <OwnerCharts txs={(txs ?? []) as any} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">Stok Menipis (≤ 5)</div>
          <div className="space-y-2">
            {(lowStock ?? []).map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm border rounded-xl p-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-gray-600">Harga: Rp {Number(p.price).toLocaleString("id-ID")}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{Number(p.stock)} {p.unit ?? ""}</div>
                  <a className="text-blue-600" href="/owner/products">Kelola</a>
                </div>
              </div>
            ))}
            {(lowStock ?? []).length === 0 && <div className="text-sm text-gray-500">Aman.</div>}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">Feedback Terbaru</div>
          <div className="space-y-2">
            {(fb ?? []).map((x: any) => (
              <div key={x.id} className="text-sm border rounded-xl p-3">
                <div className="flex justify-between">
                  <div className="font-medium">{x.name ?? "Anon"} • ⭐ {x.rating ?? "-"}</div>
                  <div className="text-gray-600">{new Date(x.created_at).toLocaleString("id-ID")}</div>
                </div>
                <div className="text-gray-700 mt-1">{x.message}</div>
                {x.transaction_id && <div className="text-xs text-gray-500 mt-1">TX: {x.transaction_id}</div>}
              </div>
            ))}
            {(fb ?? []).length === 0 && <div className="text-sm text-gray-500">Belum ada.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}