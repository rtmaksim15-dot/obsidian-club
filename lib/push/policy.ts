// Web Push, Package N1 (2026-10-25, see DECISIONS.md). Pure — the
// whole "should this push actually go out" decision as one function,
// given booleans the caller (lib/push/send.ts) has already resolved.
// Kept separate for the same reason payload.ts is: unit-testable
// without mocking Prisma/web-push, and because the task's own item 8
// ("discreet payload contains no names/text; throttle; preference
// gating; flag off = no sends; 410 cleanup") names several of these as
// independently-testable requirements.
export type PushEligibilityInput = {
  pushEnabled: boolean;
  /** true when the actor IS the recipient — e.g. commenting on your own post. */
  isOwnAction: boolean;
  isBlocked: boolean;
  recipientIsTest: boolean;
  actorIsAdmin: boolean;
  /** The recipient's own preference for this category (the relevant one of messages/replies/lordWord). */
  categoryEnabled: boolean;
};

/**
 * Everything EXCEPT the throttle — lib/push/send.ts checks this first
 * (all cheap, side-effect-free lookups) and only spends a throttle
 * check (which itself writes a RateLimitHit row) when this already
 * says yes, so a blocked/disabled/own-action call never burns part of
 * the recipient's throttle budget for a push that was never going to
 * send anyway.
 */
export function isEligibleForPush(input: PushEligibilityInput): boolean {
  if (!input.pushEnabled) return false;
  if (input.isOwnAction) return false;
  if (input.isBlocked) return false;
  // "skip is_test accounts for non-admins" — a test account never
  // receives a real push unless the actor triggering it is an admin
  // (e.g. an admin's own Word of the Lord broadcast, or an admin
  // testing a DM against a seeded test account).
  if (input.recipientIsTest && !input.actorIsAdmin) return false;
  if (!input.categoryEnabled) return false;
  return true;
}

/** The final gate, after isEligibleForPush() already passed and the throttle has actually been checked. */
export function shouldSendPush(input: PushEligibilityInput & { throttleAllowed: boolean }): boolean {
  return isEligibleForPush(input) && input.throttleAllowed;
}
