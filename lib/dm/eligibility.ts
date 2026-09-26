import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isRitualComplete } from "@/lib/auth/ritual";
import { isBlockedEitherWay } from "@/lib/moderation/block";
import { needsDmRulesAcceptance } from "@/lib/legal/dm-rules";
import { effectiveRequestStatus, isStrike } from "./lifecycle";

export const MAX_STRIKES = 2;

export type EligibilityResult = { ok: true } | { ok: false; status: number; error: string };

// Derived from prisma.$transaction's own callback param type (rather than
// the generated Prisma.TransactionClient directly) so this stays correct
// under lib/db/prisma.ts's $extends wrapper, which mints its own
// transaction-client type distinct from the unextended one.
type Client = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Everything that must be true for `sender` to send a NEW conversation
 * request to `recipientId`, checked in the order that gives the clearest
 * answer first (item 7's ritual gate, then block, then the permanent
 * two-strike door, then "you already have one outstanding"). Does NOT
 * check the daily rate limit — that's a separate, cheaper check (see
 * lib/dm/limits.ts) meant to run first in the route, before touching any
 * of this. Takes an optional Prisma client so the route can re-run this
 * inside the same transaction as the insert (closing the race between
 * two near-simultaneous requests to the same recipient), not just as an
 * earlier, separate read.
 */
export async function getRequestEligibility(
  sender: User,
  recipientId: string,
  client: Client = prisma,
): Promise<EligibilityResult> {
  if (sender.id === recipientId) {
    return { ok: false, status: 422, error: "You can't request a conversation with yourself." };
  }

  // Founder exception (see DECISIONS.md, 2026-09-10) — admins skip the
  // ritual gate everywhere else in this app; consistent here rather
  // than inventing a different rule for one feature.
  if (!sender.isAdmin && !(await isRitualComplete(sender))) {
    return { ok: false, status: 403, error: "Complete the Initiation Ritual before requesting a conversation." };
  }

  // Item 4's DM rules acceptance applies to everyone, admins included —
  // nothing carved out an exception for it, unlike the ritual gate above.
  if (await needsDmRulesAcceptance(sender.id)) {
    return { ok: false, status: 403, error: "Accept the DM rules before requesting a conversation." };
  }

  if (await isBlockedEitherWay(sender.id, recipientId)) {
    return { ok: false, status: 403, error: "You can't reach this member." };
  }

  const priorRequests = await client.conversationRequest.findMany({
    where: { senderId: sender.id, recipientId },
    select: { status: true, createdAt: true },
  });

  const strikes = priorRequests.filter(isStrike).length;
  if (strikes >= MAX_STRIKES) {
    return { ok: false, status: 403, error: "This door is closed." };
  }

  const hasOutstanding = priorRequests.some((r) => effectiveRequestStatus(r) === "pending");
  if (hasOutstanding) {
    return { ok: false, status: 409, error: "You already have a pending request to this member." };
  }

  return { ok: true };
}
