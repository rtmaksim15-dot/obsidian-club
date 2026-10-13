// Profile lite, B3 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// Pure — no "server-only", no Prisma.
export const MAX_ACTIVE_BONDS = 3;

/** Whether a member with `currentActiveCount` active bonds may enter into one more. */
export function canAddActiveBond(currentActiveCount: number): boolean {
  return currentActiveCount < MAX_ACTIVE_BONDS;
}

export type BondKindValue = "partner" | "dominant_of" | "submissive_of";

/**
 * A bond row stores one directional relationship (fromUser is
 * dominant_of toUser, say) — this renders the right phrase depending
 * on which side is viewing. "partner" is symmetric by nature, so it
 * reads the same from either side.
 */
export function describeBondForOwner(
  kind: BondKindValue,
  ownerIsFromUser: boolean,
  otherDisplayName: string,
): string {
  if (kind === "partner") {
    return `Partner of ${otherDisplayName}`;
  }
  if (kind === "dominant_of") {
    return ownerIsFromUser ? `Dominant of ${otherDisplayName}` : `Submissive to ${otherDisplayName}`;
  }
  // submissive_of
  return ownerIsFromUser ? `Submissive to ${otherDisplayName}` : `Dominant of ${otherDisplayName}`;
}
