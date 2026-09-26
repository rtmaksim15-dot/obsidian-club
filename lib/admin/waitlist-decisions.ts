import "server-only";
import type { ApplicationHoldReason, Waitlist } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { track } from "@/lib/analytics/track";
import { generateInviteToken } from "@/lib/utils/codes";
import { computeValidUntil, HARD_CAP_DAYS } from "@/lib/invites/lifecycle";
import { sendApplicationAcceptedEmail, sendApplicationDeclinedEmail } from "@/lib/utils/email";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";

// Email captures — Accept/Hold/Decline (2026-09-22, see DECISIONS.md):
// this is the approve/hold/decline/resend logic that PATCH
// /api/admin/applications/[id] used to inline directly. Extracted here,
// unchanged, so that route and the new PATCH
// /api/admin/email-captures/[id] (which first finds-or-creates a
// Waitlist row for the capture's email, then calls exactly these same
// functions) share one real implementation — a capture and an
// application converge on the same Waitlist row and the same state
// machine the moment either one is acted on, never a second pipeline.
// Every doors-open/access rule an approved application gets (see
// lib/config/doors.ts) already flows from the InviteToken this mints,
// so reusing this function is what makes that rule apply automatically —
// nothing about that gating is duplicated or re-checked here.

export const VALID_HOLD_REASONS: ApplicationHoldReason[] = [
  "order_not_confirmed",
  "age_check_needed",
  "needs_follow_up",
  "waiting",
];

export type DecisionResult =
  | { ok: true; status: "approved"; emailSent: boolean }
  | { ok: true; status: "held" }
  | { ok: true; status: "declined"; emailSent: boolean }
  | { ok: true; emailSent: boolean }
  | { ok: false; httpStatus: number; error: string };

/** Guard shared by approve/hold/decline: both start from the same two legal states. */
function canDecide(entry: Waitlist): boolean {
  return entry.status === "pending" || entry.status === "held";
}

export async function approveWaitlistEntry(
  entry: Waitlist,
  adminId: string,
  ageVerified: boolean,
): Promise<DecisionResult> {
  if (!canDecide(entry)) {
    return { ok: false, httpStatus: 409, error: `Already ${entry.status}.` };
  }

  const now = new Date();

  const token = await prisma.inviteToken.create({
    data: {
      token: generateInviteToken(),
      source: "application",
      validUntil: computeValidUntil(now),
      clientWindowDays: HARD_CAP_DAYS,
      status: "unused",
    },
  });

  await prisma.waitlist.update({
    where: { id: entry.id },
    data: {
      status: "approved",
      reviewedAt: now,
      reviewedBy: adminId,
      ageVerified,
      ageVerifiedAt: ageVerified ? now : null,
      ageVerifiedThreshold: ageVerified ? MIN_MEMBER_AGE : null,
      applicationTokenId: token.id,
    },
  });

  const waitDays = Math.floor((now.getTime() - entry.createdAt.getTime()) / 86_400_000);
  await track({
    userId: null,
    type: "waitlist.approved",
    entity: "invite",
    entityId: entry.id,
    meta: { reviewedBy: adminId, waitDays },
  });

  const result = await sendApplicationAcceptedEmail(entry.email, token.token);
  await prisma.waitlist.update({
    where: { id: entry.id },
    data: result.ok
      ? { decisionEmailSentAt: new Date(), decisionEmailSendError: null }
      : { decisionEmailSendError: result.error ?? "Unknown error" },
  });

  return { ok: true, status: "approved", emailSent: result.ok };
}

export async function holdWaitlistEntry(
  entry: Waitlist,
  adminId: string,
  heldReason: string | undefined,
  heldNote: string | undefined,
): Promise<DecisionResult> {
  if (!canDecide(entry)) {
    return { ok: false, httpStatus: 409, error: `Already ${entry.status}.` };
  }
  if (!heldReason || !VALID_HOLD_REASONS.includes(heldReason as ApplicationHoldReason)) {
    return { ok: false, httpStatus: 422, error: "A hold reason is required." };
  }

  await prisma.waitlist.update({
    where: { id: entry.id },
    data: {
      status: "held",
      heldReason: heldReason as ApplicationHoldReason,
      heldNote: heldNote?.trim() || null,
      heldAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: adminId,
    },
  });

  return { ok: true, status: "held" };
}

export async function declineWaitlistEntry(entry: Waitlist, adminId: string): Promise<DecisionResult> {
  if (!canDecide(entry)) {
    return { ok: false, httpStatus: 409, error: `Already ${entry.status}.` };
  }

  // PRODUCT.md §1: declines carry no explanation — that opacity is
  // intentional; sendApplicationDeclinedEmail gives no reason either.
  await prisma.waitlist.update({
    where: { id: entry.id },
    data: { status: "declined", reviewedAt: new Date(), reviewedBy: adminId },
  });
  await track({ userId: null, type: "waitlist.rejected", entity: "invite", entityId: entry.id });

  const result = await sendApplicationDeclinedEmail(entry.email);
  await prisma.waitlist.update({
    where: { id: entry.id },
    data: result.ok
      ? { decisionEmailSentAt: new Date(), decisionEmailSendError: null }
      : { decisionEmailSendError: result.error ?? "Unknown error" },
  });

  return { ok: true, status: "declined", emailSent: result.ok };
}

export async function resendApprovalEmail(entry: Waitlist): Promise<DecisionResult> {
  if (entry.status !== "approved") {
    return { ok: false, httpStatus: 422, error: "Only an approved application can be resent." };
  }
  if (!entry.applicationTokenId) {
    return { ok: false, httpStatus: 422, error: "No token to resend." };
  }
  const token = await prisma.inviteToken.findUnique({ where: { id: entry.applicationTokenId } });
  if (!token) {
    return { ok: false, httpStatus: 404, error: "Token not found." };
  }

  const result = await sendApplicationAcceptedEmail(entry.email, token.token);
  await prisma.waitlist.update({
    where: { id: entry.id },
    data: result.ok
      ? { decisionEmailSentAt: new Date(), decisionEmailSendError: null }
      : { decisionEmailSendError: result.error ?? "Unknown error" },
  });

  return { ok: true, emailSent: result.ok };
}
