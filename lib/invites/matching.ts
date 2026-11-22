// Invite list reconciliation, 2026-11-21 (see DECISIONS.md). Pure —
// the one rule every comparison against `invite_list.email` must use
// consistently: lowercase + trim. `invite_list.email` is already
// stored normalized (scripts/import-invite-list.ts normalizes before
// every write, and the column itself is `unique`), but `User.email`/
// `Waitlist.email` have no such guarantee at the schema level — every
// query that matches one against the other normalizes both sides with
// this same function rather than trusting either store's own casing.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Empty/whitespace-only strings are treated as absent (null), not an empty string in the DB — matches how every other optional text column in this schema is written. */
export function normalizeOptionalField(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
