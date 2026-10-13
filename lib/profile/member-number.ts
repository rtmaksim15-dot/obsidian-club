// Profile lite, B1 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// Pure — no "server-only", no Prisma — so both halves (the backfill's
// ordering rule and the display format) are unit-testable.

export type MemberNumberCandidate = { id: string; joinedAt: Date | null; createdAt: Date };

/**
 * Mirrors the migration's own backfill rule exactly (supabase/
 * migrations/20261013120000_profile_lite.sql: `row_number() over
 * (order by coalesce(joined_at, created_at) asc)`, excluding the
 * founder) — kept here as a reusable, testable TypeScript model of
 * that same ordering rule, not something the migration itself calls
 * (the migration is raw SQL, run directly against Postgres).
 */
export function assignMemberNumbers(users: MemberNumberCandidate[], excludeId: string): Map<string, number> {
  const ordered = users
    .filter((u) => u.id !== excludeId)
    .slice()
    .sort((a, b) => (a.joinedAt ?? a.createdAt).getTime() - (b.joinedAt ?? b.createdAt).getTime());

  const result = new Map<string, number>();
  ordered.forEach((u, i) => result.set(u.id, i + 1));
  return result;
}

/** "Member № 0042" — zero-padded to 4 digits. "Founder" for Lord Obsidian, never a number. */
export function formatMemberNumber(memberNumber: number | null, isFounderAccount: boolean): string {
  if (isFounderAccount) return "Founder";
  if (memberNumber === null) return "";
  return `Member № ${String(memberNumber).padStart(4, "0")}`;
}
