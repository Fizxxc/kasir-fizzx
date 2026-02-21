"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginClient() {
  const sb = supabaseBrowser();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/pos";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return setErr(error.message);

    router.push(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Login Kasir / Owner</h1>

        <input
          className="w-full border rounded-xl p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded-xl p-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button className="w-full rounded-xl bg-black text-white p-3">Masuk</button>
      </form>
    </div>
  );
}