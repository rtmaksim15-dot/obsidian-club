// Admin "Linked accounts" (2026-11-22, see DECISIONS.md) — pure
// pieces shared by the bulk admin/page.tsx fetch and the single-row
// GET /api/admin/members/:id endpoint, so the bonds/"brought in"
// shaping logic exists exactly once rather than being copy-pasted
// across both call sites.
export type BroughtInEntry = {
  id: string;
  type: "member" | "applicant";
  displayName: string;
  status: string;
};

/**
 * "People they brought in" — direct member-invite-link registrations
 * (already a User) and applicants who used their sponsor code but
 * haven't registered yet (still a Waitlist row), combined into one
 * list. Members first, then applicants, each in the order given.
 */
export function mergeBroughtIn(
  invitees: { id: string; displayName: string }[],
  sponsoredApplicants: { id: string; displayName: string; status: string }[],
): BroughtInEntry[] {
  return [
    ...invitees.map((i) => ({ id: i.id, type: "member" as const, displayName: i.displayName, status: "registered" })),
    ...sponsoredApplicants.map((s) => ({ id: s.id, type: "applicant" as const, displayName: s.displayName, status: s.status })),
  ];
}

export type ResolvedBond = {
  id: string;
  kind: string;
  status: string;
  otherId: string;
  otherName: string;
  direction: "from" | "to";
};

type BondRow = {
  id: string;
  kind: string;
  status: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  toUserName: string;
};

/** Resolves each Bond row (which carries both sides) to "the other party, from this person's point of view." */
export function resolveBondsForPerson(personId: string, bonds: BondRow[]): ResolvedBond[] {
  return bonds.map((b) => {
    const direction: "from" | "to" = b.fromUserId === personId ? "from" : "to";
    return {
      id: b.id,
      kind: b.kind,
      status: b.status,
      otherId: direction === "from" ? b.toUserId : b.fromUserId,
      otherName: direction === "from" ? b.toUserName : b.fromUserName,
      direction,
    };
  });
}
