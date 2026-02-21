import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-black" />
            <div className="leading-tight">
              <div className="font-semibold">POS UMKM</div>
              <div className="text-xs text-gray-600">Next.js + Supabase</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/pos"
              className="rounded-xl bg-black text-white px-4 py-2 text-sm"
            >
              Buka POS
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-gray-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Siap untuk kasir 2 monitor + struk 58mm
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            Web Kasir UMKM yang cepat, rapi, dan profesional.
          </h1>

          <p className="text-gray-600 text-base leading-relaxed">
            Sistem POS berbasis web dengan mode kasir & owner, dukungan monitor customer display
            seperti supermarket, manajemen produk & stok, dashboard laporan, serta struk thermal 58mm
            dengan QR untuk saran & kritik pelanggan.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="rounded-xl bg-black text-white px-5 py-3 text-sm">
              Mulai (Login)
            </Link>
            <Link href="/owner" className="rounded-xl border px-5 py-3 text-sm hover:bg-gray-50">
              Owner Dashboard
            </Link>
            <Link href="/feedback" className="rounded-xl border px-5 py-3 text-sm hover:bg-gray-50">
              Halaman Feedback
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-600">2 Monitor</div>
              <div className="font-semibold">Kasir + Customer</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-600">Struk 58mm</div>
              <div className="font-semibold">Logo + QR</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-sm text-gray-600">Supabase</div>
              <div className="font-semibold">Auth + RLS</div>
            </div>
          </div>
        </div>

        {/* Mock UI */}
        <div className="rounded-3xl border bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Preview</div>
            <div className="text-xs text-gray-600">POS • Dashboard • Produk</div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-2xl bg-white border p-4">
              <div className="text-sm text-gray-600">POS</div>
              <div className="mt-2 h-3 w-3/4 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-gray-200" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="h-10 rounded-xl bg-gray-100 border" />
                <div className="h-10 rounded-xl bg-gray-100 border" />
                <div className="h-10 rounded-xl bg-gray-100 border" />
              </div>
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <div className="text-sm text-gray-600">Owner Dashboard</div>
              <div className="mt-3 h-28 rounded-xl bg-gray-100 border" />
            </div>

            <div className="rounded-2xl bg-white border p-4">
              <div className="text-sm text-gray-600">Produk & Stok</div>
              <div className="mt-2 space-y-2">
                <div className="h-10 rounded-xl bg-gray-100 border" />
                <div className="h-10 rounded-xl bg-gray-100 border" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-3xl border p-8">
          <h2 className="text-2xl font-semibold">Fitur Utama</h2>
          <p className="text-gray-600 mt-2">
            Dibuat untuk workflow kasir harian: cepat input, jelas di customer display, laporan rapi untuk owner.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">Shift Kasir</div>
              <div className="text-sm text-gray-600 mt-1">Buka/tutup toko sebelum transaksi.</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">Transaksi + Struk</div>
              <div className="text-sm text-gray-600 mt-1">Thermal 58mm + QR feedback.</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">Manajemen Stok</div>
              <div className="text-sm text-gray-600 mt-1">Tambah produk, ubah harga, adjust stok.</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">Dashboard Owner</div>
              <div className="text-sm text-gray-600 mt-1">Trend omzet & komposisi pembayaran.</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">Role Based Access</div>
              <div className="text-sm text-gray-600 mt-1">Owner vs Kasir dengan RLS Supabase.</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="font-semibold">Customer Display</div>
              <div className="text-sm text-gray-600 mt-1">Monitor kedua seperti supermarket.</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/pos" className="rounded-xl bg-black text-white px-5 py-3 text-sm">
              Coba POS
            </Link>
            <Link href="/login" className="rounded-xl border px-5 py-3 text-sm hover:bg-gray-50">
              Login dulu
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-gray-600 flex flex-wrap justify-between gap-2">
          <div>© {new Date().getFullYear()} POS UMKM</div>
          <div className="flex gap-3">
            <Link className="hover:text-black" href="/login">Login</Link>
            <Link className="hover:text-black" href="/feedback">Feedback</Link>
            <Link className="hover:text-black" href="/pos">POS</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}