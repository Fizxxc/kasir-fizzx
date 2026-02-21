import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  if (cached) return cached;

  // ✅ HARUS statis agar Next bisa inline ke client bundle
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "Supabase env belum terbaca di CLIENT. Pastikan variabel bernama NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY ada di .env/.env.local, lalu restart dev server."
    );
  }

  cached = createBrowserClient(url, key);
  return cached;
}