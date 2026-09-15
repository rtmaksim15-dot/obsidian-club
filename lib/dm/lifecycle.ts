import "server-only";
import type { ConversationRequestStatus } from "@prisma/client";

// A conversation begins with consent, never with intrusion (2026-09-14,
// see DECISIONS.md). "An unanswered request expires after 5 days" is
// computed live, never via a cron — this app has none, and every other
// time-based lifecycle here (InviteToken's evaluateTokenLifecycle(),
// getDoorsState()) already works this way. `status` in the database
// stays "pending" until something actually touches an overdue row; every
// read path must go through effectiveRequestStatus() below, never the
// raw column, when deciding whether a request is still live.
export const REQUEST_EXPIRY_MS = 5 * 24 * 60 * 60 * 1000;

export type ConversationRequestLike = {
  status: ConversationRequestStatus;
  createdAt: Date;
};

export function isRequestExpired(request: ConversationRequestLike): boolean {
  return request.status === "pending" && Date.now() - request.createdAt.getTime() > REQUEST_EXPIRY_MS;
}

/** The status a request actually has right now — "pending" only if it hasn't overdue-expired. */
export function effectiveRequestStatus(request: ConversationRequestLike): ConversationRequestStatus {
  return isRequestExpired(request) ? "expired" : request.status;
}

/**
 * Counts as a "strike" toward the two-attempt limit (item 4): a real
 * decline, or a request that expired from silence. NOT `cancelled` — a
 * block already closes the door on its own, unconditionally, so a
 * block-triggered cancellation shouldn't also consume a strike.
 */
export function isStrike(request: ConversationRequestLike): boolean {
  const status = effectiveRequestStatus(request);
  return status === "declined" || status === "expired";
}
