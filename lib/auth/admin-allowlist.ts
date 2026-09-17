import "server-only";

// Admin access hardening (item 2, 2026-09-17, see DECISIONS.md). Admin
// identity now comes from exactly one place: this env var, a
// comma-separated list of User.id UUIDs. No UI or DB path can grant it
// — User.isAdmin still exists as a schema column (removing it would
// touch every one of the ~17 call sites that read it elsewhere in this
// app for no real safety gain), but getCurrentUser() overwrites it with
// this allowlist's answer before returning the user to ANY caller, so
// the column's actual stored value has zero effect on authorization
// from this point on. Parsed once per cold start, not per request.
const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

if (ADMIN_IDS.size === 0) {
  console.error(
    "[admin-allowlist] ADMIN_USER_IDS is empty or unset — no account can pass isAdminId(), meaning nobody " +
      "can reach /admin or any admin API route right now, regardless of what User.isAdmin says in the database.",
  );
}

export function isAdminId(userId: string): boolean {
  return ADMIN_IDS.has(userId);
}
