import type { CookieOptionsWithName } from "@supabase/ssr";

// Fix 9 (2026-09-29, see DECISIONS.md) — every createServerClient/
// createBrowserClient call in this codebase passes this so the Supabase
// session cookie is Secure (HTTPS-only transport; this site never
// serves plain HTTP) without touching httpOnly or sameSite:
//
// - httpOnly stays false, deliberately, not by oversight. The browser
//   client (login/page.tsx's password sign-in, RoomChat/DmThreadChat's
//   Realtime subscriptions, ContentComposer's direct-to-Storage upload)
//   reads and writes this same cookie via document.cookie — and
//   HttpOnly can only ever be set through a Set-Cookie response header,
//   never through document.cookie, so a server-only httpOnly flag would
//   just fight the browser client's own writes to the same cookie name
//   rather than protect anything. See CLAUDE.md for the one-line
//   summary of this tradeoff.
// - sameSite stays "lax" (the package default) — "strict" would drop
//   the cookie on the top-level cross-site redirect back from Google/
//   Apple OAuth, breaking sign-in for anyone using it.
export const SUPABASE_COOKIE_OPTIONS: CookieOptionsWithName = { secure: true };
