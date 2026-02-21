export const dynamic = "force-dynamic";

export default function EnvCheck() {
  return (
    <pre style={{ padding: 24 }}>
      NEXT_PUBLIC_SUPABASE_URL = {String(process.env.NEXT_PUBLIC_SUPABASE_URL)}
      {"\n"}
      NEXT_PUBLIC_SUPABASE_ANON_KEY ={" "}
      {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET ✅" : "MISSING ❌"}
    </pre>
  );
}