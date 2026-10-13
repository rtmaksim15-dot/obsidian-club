// Profile lite, B2 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// Pure visibility decision — no "server-only", no Prisma.
export type PracticesVisibility = "only_me" | "following" | "members";

export const DEFAULT_PRACTICES_VISIBILITY: PracticesVisibility = "following";

export const PRACTICES_VISIBILITY_VALUES: PracticesVisibility[] = ["only_me", "following", "members"];

/**
 * `isFollowedByOwner` — same relation direction as lib/dm/boundaries.ts's
 * whoCanMessage: "following" (the gate-holder's own follow list
 * decides who's let in, not the viewer's) — true when the PROFILE
 * OWNER follows the viewer, not the other way around.
 */
export function canViewPractices(
  visibility: PracticesVisibility,
  isOwner: boolean,
  isFollowedByOwner: boolean,
): boolean {
  if (isOwner) return true;
  switch (visibility) {
    case "only_me":
      return false;
    case "following":
      return isFollowedByOwner;
    case "members":
      // The caller only ever reaches this for an authenticated,
      // already-identified viewer (an anonymous visitor has no
      // viewerId to pass in the first place) — "members" means
      // exactly that: anyone past the membership gate.
      return true;
  }
}
