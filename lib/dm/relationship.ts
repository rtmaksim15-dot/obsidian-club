import "server-only";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { needsDmRulesAcceptance } from "@/lib/legal/dm-rules";
import { effectiveRequestStatus, isStrike } from "./lifecycle";
import { MAX_STRIKES } from "./eligibility";

export type MessageButtonState =
  | { type: "hidden" }
  | { type: "start"; needsDmRules: boolean }
  | { type: "outgoing_pending" }
  | { type: "incoming_pending"; requestId: string }
  | { type: "thread"; threadId: string };

/**
 * Drives the profile "Message" button (item 2, 2026-09-20, see
 * DECISIONS.md) — one of five states, checked in the order that
 * resolves the clearest, most permanent fact first: an existing
 * reachable thread beats a stale pending request, a pending request
 * (either direction) beats offering a fresh one, and the permanent
 * two-strike door (see lib/dm/eligibility.ts#getRequestEligibility, the
 * same rule a real POST /api/dm/requests would enforce) hides the
 * button entirely rather than showing a button that would just 403.
 * Blocked is checked by the caller first (profile page already early-
 * returns on a mutual block before this ever runs).
 */
export async function getMessageButtonState(viewer: User, targetId: string): Promise<MessageButtonState> {
  if (viewer.id === targetId) return { type: "hidden" };

  const thread = await prisma.thread.findFirst({
    where: {
      OR: [
        { participantAId: viewer.id, participantBId: targetId },
        { participantAId: targetId, participantBId: viewer.id },
      ],
    },
    select: { id: true },
  });
  if (thread) {
    const participant = await prisma.threadParticipant.findUnique({
      where: { threadId_userId: { threadId: thread.id, userId: viewer.id } },
    });
    if (participant && !participant.leftAt) {
      return { type: "thread", threadId: thread.id };
    }
  }

  const incoming = await prisma.conversationRequest.findFirst({
    where: { senderId: targetId, recipientId: viewer.id, status: "pending" },
    select: { id: true, status: true, createdAt: true },
  });
  if (incoming && effectiveRequestStatus(incoming) === "pending") {
    return { type: "incoming_pending", requestId: incoming.id };
  }

  const outgoing = await prisma.conversationRequest.findFirst({
    where: { senderId: viewer.id, recipientId: targetId, status: "pending" },
    select: { id: true, status: true, createdAt: true },
  });
  if (outgoing && effectiveRequestStatus(outgoing) === "pending") {
    return { type: "outgoing_pending" };
  }

  const priorRequests = await prisma.conversationRequest.findMany({
    where: { senderId: viewer.id, recipientId: targetId },
    select: { status: true, createdAt: true },
  });
  if (priorRequests.filter(isStrike).length >= MAX_STRIKES) {
    return { type: "hidden" };
  }

  return { type: "start", needsDmRules: await needsDmRulesAcceptance(viewer.id) };
}
