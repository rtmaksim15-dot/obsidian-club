import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components (ADR-0010). Uses the public
// anon key — safe to expose, RLS enforces actual access control.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
