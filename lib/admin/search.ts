// Admin console search (2026-11-22, see DECISIONS.md) — shared,
// pure pieces of GET /api/admin/search: the actual name/handle/email
// matching is Postgres's own case-insensitive `contains` (Prisma's
// `mode: "insensitive"`, parameterized), not reimplemented here. What
// IS pure and worth testing in isolation: the "too short to search"
// guard (min 2 chars) and merging the two entity types' results into
// one capped, consistently-ordered list (max 20) — both are plain
// logic the route calls directly, not test-only scaffolding.
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_RESULTS = 20;

export type AdminSearchResultType = "applicant" | "member";

export type AdminSearchResult = {
  id: string;
  type: AdminSearchResultType;
  displayName: string;
  handle: string | null;
  status: string;
  createdAt: string; // ISO
};

export function normalizeSearchQuery(raw: string): string {
  return raw.trim();
}

export function isSearchQueryValid(query: string): boolean {
  return query.length >= SEARCH_MIN_LENGTH;
}

/**
 * Combines applicant + member matches into one list, most recent
 * first, capped at SEARCH_MAX_RESULTS — applied across the combined
 * set (not per type), so a query that only matches applicants can
 * fill all 20 slots with applicants.
 */
export function mergeSearchResults(
  applicantResults: AdminSearchResult[],
  memberResults: AdminSearchResult[],
): AdminSearchResult[] {
  return [...applicantResults, ...memberResults]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, SEARCH_MAX_RESULTS);
}
