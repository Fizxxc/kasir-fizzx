import { supabaseServer } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import ProductForm from "./ProductForm";

export const dynamic = "force-dynamic";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  price: number;
  stock: number;
  unit: string | null;
  is_active: boolean;
};

export default async function OwnerProductsPage() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "owner") {
    return <div>Akses ditolak</div>;
  }

  const sb = await supabaseServer();

  const { data: products } = await sb
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Produk & Stok</h1>
        <p className="text-sm text-gray-600">
          Tambah produk, ubah harga, stok, dan scan barcode.
        </p>
      </div>

      <ProductForm />

      <div className="rounded-2xl border overflow-hidden">
        <div className="p-4 font-semibold border-b">Daftar Produk</div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Nama</th>
                <th className="text-left p-3">Barcode</th>
                <th className="text-right p-3">Harga</th>
                <th className="text-right p-3">Stok</th>
                <th className="text-left p-3">Unit</th>
                <th className="text-center p-3">Aktif</th>
              </tr>
            </thead>
            <tbody>
              {(products as any as Product[] | null)?.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 font-mono text-xs">
                    {p.barcode ?? "-"}
                  </td>
                  <td className="p-3 text-right">
                    {Number(p.price).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3 text-right">
                    {Number(p.stock).toLocaleString("id-ID")}
                  </td>
                  <td className="p-3">{p.unit ?? "-"}</td>
                  <td className="p-3 text-center">
                    {p.is_active ? "✅" : "—"}
                  </td>
                </tr>
              ))}

              {!products?.length && (
                <tr>
                  <td colSpan={6} className="p-3 text-gray-500">
                    Belum ada produk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}