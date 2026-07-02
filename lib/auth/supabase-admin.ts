import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client (ADR-0010) — bypasses RLS entirely.
// Server-only: used for admin operations like creating a user on
// application approval. NEVER import this in a Client Component or
// anything that ships to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
