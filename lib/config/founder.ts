// Lord Obsidian (2026-09-27) — "the voice of the world," not an ordinary
// member: wherever his REP number renders, it shows ∞ instead, and he
// has no level line at all (see isFounder's call sites). A dedicated
// constant, not a hardcoded email check in markup, and not a DB column
// either — a schema change for one account wasn't worth a migration on
// the shared production database (explicit call, see DECISIONS.md).
// Purely a display switch: nothing here touches lib/rating/rep-engine.ts
// or any arithmetic — his User.rep keeps being a real, ordinary number
// underneath, adjustable via /admin/rep exactly like anyone else's.
const FOUNDER_USER_ID = "e75c0f85-3b91-49c4-a610-0bc17839476a";

export function isFounder(userId: string): boolean {
  return userId === FOUNDER_USER_ID;
}
