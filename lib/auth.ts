import { supabaseServer } from "@/lib/supabase/server";

export async function getSessionProfile() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();

  if (!auth.user) return { user: null, profile: null };

  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single();

  return { user: auth.user, profile };
}