// Invite list reconciliation, 2026-11-21 (see DECISIONS.md). Pure
// classification for where one invite-list person currently sits in
// the funnel: invited -> applied (has a Waitlist row, any status) ->
// pending approval / approved (current Waitlist status, only while
// not yet an active account) -> active account (User exists).
//
// "Applied" is reported separately from this bucket: someone whose
// bucket is "activeAccount" still counts toward "applied" if they
// have a Waitlist row, since they passed through that stage on their
// way to registering. hasApplied() is how callers get that, kept
// distinct from the mutually-exclusive bucket so the two can't drift.
export type InviteWaitlistStatus = "pending" | "held" | "approved" | "declined";

export type FunnelBucket = "activeAccount" | "approved" | "pendingApproval" | "appliedOnly" | "invitedOnly";

export function classifyInviteRow(params: {
  isActiveAccount: boolean;
  waitlistStatus: InviteWaitlistStatus | null;
}): FunnelBucket {
  if (params.isActiveAccount) return "activeAccount";
  if (params.waitlistStatus === "approved") return "approved";
  if (params.waitlistStatus === "pending" || params.waitlistStatus === "held") return "pendingApproval";
  if (params.waitlistStatus !== null) return "appliedOnly";
  return "invitedOnly";
}

export function hasApplied(bucket: FunnelBucket): boolean {
  return bucket !== "invitedOnly";
}
