import "server-only";

// Launch preview (2026-09-18, see DECISIONS.md). A small set of manually
// invited accounts get the full, as-if-launched experience — doors open,
// no antechamber — while every other real member still sees the holding
// page until DOORS_OPEN_DATE. PREVIEW_USER_IDS: a comma-separated list
// of User.id UUIDs, same shape and same reasoning as ADMIN_USER_IDS
// (lib/auth/admin-allowlist.ts) — never in code, never a DB column, no
// UI toggle, no query param, no client-settable cookie. Parsed once per
// cold start; adding an id is a Vercel env var change, not a deploy.
//
// Deliberately NOT the same mechanism as isAdmin: a preview account
// should experience the app as a real launched member would — still
// gated by the Initiation Ritual, still subject to every room-access
// rule (level, the newcomers 30-day window) — only the doors/
// antechamber holding gate is bypassed. See lib/config/doors.ts#bypassesDoors().
const PREVIEW_IDS = new Set(
  (process.env.PREVIEW_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isPreviewId(userId: string): boolean {
  return PREVIEW_IDS.has(userId);
}
