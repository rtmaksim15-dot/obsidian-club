// My Boundaries (Package 4, Phase A, 2026-10-13, see DECISIONS.md) —
// the pure, DB-free half of lib/dm/boundaries.ts, split out so the
// actual decision matrix is unit-testable without pulling in the
// "server-only" guard (boundaries.ts imports it, same as every other
// server-only lib/ module in this codebase) or a Prisma client.
export type WhoCanMessage = "members" | "following" | "nobody_new";

export type BoundariesSettings = {
  whoCanMessage: WhoCanMessage;
  showCity: boolean;
  acceptRequests: boolean;
};

export const DEFAULT_BOUNDARIES: BoundariesSettings = {
  whoCanMessage: "members",
  showCity: false,
  acceptRequests: true,
};

export const WHO_CAN_MESSAGE_VALUES: WhoCanMessage[] = ["members", "following", "nobody_new"];

export function parseBoundaries(raw: unknown): BoundariesSettings {
  const obj = (raw ?? {}) as Record<string, unknown>;
  return {
    whoCanMessage: WHO_CAN_MESSAGE_VALUES.includes(obj.whoCanMessage as WhoCanMessage)
      ? (obj.whoCanMessage as WhoCanMessage)
      : DEFAULT_BOUNDARIES.whoCanMessage,
    showCity: typeof obj.showCity === "boolean" ? obj.showCity : DEFAULT_BOUNDARIES.showCity,
    acceptRequests: typeof obj.acceptRequests === "boolean" ? obj.acceptRequests : DEFAULT_BOUNDARIES.acceptRequests,
  };
}

export type BoundariesVerdict = { allowed: true } | { allowed: false; reason: string };

const NOT_ACCEPTING_MESSAGE = "This member is not receiving new conversations.";
const FOLLOWING_ONLY_MESSAGE = "This member only accepts first messages from people they follow.";

/**
 * Given the RECIPIENT's own boundaries and whether the recipient
 * already follows the sender, decides whether a brand new conversation
 * request from that sender may proceed.
 */
export function evaluateBoundaries(settings: BoundariesSettings, isFollowedByRecipient: boolean): BoundariesVerdict {
  if (!settings.acceptRequests) {
    return { allowed: false, reason: NOT_ACCEPTING_MESSAGE };
  }
  if (settings.whoCanMessage === "nobody_new") {
    return { allowed: false, reason: NOT_ACCEPTING_MESSAGE };
  }
  if (settings.whoCanMessage === "following" && !isFollowedByRecipient) {
    return { allowed: false, reason: FOLLOWING_ONLY_MESSAGE };
  }
  return { allowed: true };
}
