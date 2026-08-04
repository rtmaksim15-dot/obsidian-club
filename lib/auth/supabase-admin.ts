import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client (ADR-0010) — bypasses RLS entirely.
// Server-only: used for admin operations like creating a user on
// application approval. NEVER import this in a Client Component or
// anything that ships to the browser. `import "server-only"` (August
// hardening pass, Block 2, 2026-08-04) turns an accidental client-side
// import into a build error instead of relying on nobody doing it —
// same guard lib/analytics/track.ts already uses for the same reason.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
