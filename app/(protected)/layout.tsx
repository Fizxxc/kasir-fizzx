import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getSessionProfile();

  async function signOut() {
    "use server";
    const s = await supabaseServer();
    await s.auth.signOut();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-6xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/pos" className="font-semibold">POS UMKM</Link>
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">Dashboard</Link>
            {profile?.role === "owner" && (
              <>
                <Link href="/pos-kalkulator" className="text-sm text-gray-600 hover:text-black">
                  POS Kalkulator
                </Link>
                <Link href="/owner" className="text-sm text-gray-600 hover:text-black">Owner</Link>
                <Link href="/owner/products" className="text-sm text-gray-600 hover:text-black">Produk & Stok</Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {profile?.full_name ?? "User"} • {profile?.role ?? "-"}
            </span>
            <form action={signOut}>
              <button className="rounded-xl border px-3 py-2 text-sm">Logout</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}