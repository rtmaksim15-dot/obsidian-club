// Clean Hall, B3 follow-up (Package 5, Phase B, 2026-10-14, see
// DECISIONS.md). Pure — no "server-only", no Prisma — the whole rule
// for whether a member may soft-delete their OWN room message. Same
// { ok, status, error } shape as lib/dm/eligibility.ts#EligibilityResult.
export type OwnMessageDeleteCheck = { ok: true } | { ok: false; status: number; error: string };

export function canDeleteOwnMessage(params: {
  isAuthor: boolean;
  isDeleted: boolean;
  preserveIndefinitely: boolean;
  hasOpenReport: boolean;
}): OwnMessageDeleteCheck {
  if (!params.isAuthor) {
    return { ok: false, status: 403, error: "You can only delete your own messages." };
  }
  if (params.isDeleted) {
    return { ok: false, status: 409, error: "This message has already been removed." };
  }
  if (params.preserveIndefinitely) {
    return { ok: false, status: 403, error: "This message can't be removed." };
  }
  if (params.hasOpenReport) {
    return { ok: false, status: 409, error: "This message is under review and can't be removed right now." };
  }
  return { ok: true };
}
