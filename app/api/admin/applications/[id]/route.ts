import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { isRitualComplete } from "@/lib/auth/ritual";
import {
  approveWaitlistEntry,
  holdWaitlistEntry,
  declineWaitlistEntry,
  resendApprovalEmail,
} from "@/lib/admin/waitlist-decisions";

type Action = "approve" | "decline" | "hold" | "resend";

type Body = { action?: Action; ageVerified?: boolean; heldReason?: string; heldNote?: string };

// GET /api/admin/applications/:id (2026-11-22, see DECISIONS.md) — the
// single-row counterpart to admin/page.tsx's bulk applications fetch,
// for the admin search feature: a search result can match a row
// outside the console's own default-loaded set (any status, not just
// pending/held/failed-send/approved), so AdminConsole fetches it here
// on demand rather than requiring it to already be in client state.
// Returns the exact same shape admin/page.tsx builds, just resolved
// via direct relations (applicationToken, reviewer lookup) instead of
// that file's batched-across-many-rows approach — simpler and correct
// for exactly one row, not a reimplementation of the batching itself.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const a = await prisma.waitlist.findUnique({
    where: { id: params.id },
    include: { applicationToken: { select: { redeemedAt: true, redeemedById: true } } },
  });
  if (!a) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const reviewer = a.reviewedBy ? await prisma.user.findUnique({ where: { id: a.reviewedBy } }) : null;
  // Linked accounts (2026-11-22, see DECISIONS.md) — admin-only
  // sponsor tracking, see Waitlist.sponsor's own schema comment.
  const sponsor = a.invitedBy ? await prisma.user.findUnique({ where: { id: a.invitedBy } }) : null;

  let registered: boolean | null = null;
  let memberAgeVerified: boolean | null = null;
  let memberOnboardingComplete: boolean | null = null;
  if (a.status === "approved") {
    registered = Boolean(a.applicationToken?.redeemedAt);
    const redeemedById = a.applicationToken?.redeemedById ?? null;
    const member = redeemedById ? await prisma.user.findUnique({ where: { id: redeemedById } }) : null;
    memberAgeVerified = member ? member.ageVerified : false;
    memberOnboardingComplete = member ? await isRitualComplete(member) : false;
  }

  return NextResponse.json({
    application: {
      id: a.id,
      name: a.name,
      email: a.email,
      age: a.age,
      city: a.city,
      source: a.source,
      reason: a.reason,
      referralCode: a.referralCode,
      origin: a.origin,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      heldReason: a.heldReason,
      heldNote: a.heldNote,
      heldAt: a.heldAt ? a.heldAt.toISOString() : null,
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
      reviewerName: reviewer?.displayName ?? null,
      ageVerified: a.ageVerified,
      ageVerifiedAt: a.ageVerifiedAt ? a.ageVerifiedAt.toISOString() : null,
      hasToken: a.applicationTokenId !== null,
      decisionEmailSentAt: a.decisionEmailSentAt ? a.decisionEmailSentAt.toISOString() : null,
      decisionEmailSendError: a.decisionEmailSendError,
      registered,
      memberAgeVerified,
      memberOnboardingComplete,
      sponsorId: a.invitedBy,
      sponsorName: sponsor?.displayName ?? null,
    },
  });
}

// PATCH /api/admin/applications/:id — approve, decline, hold, or resend
// a waitlist entry.
//
// The actual state-machine logic (status guards, InviteToken minting,
// track() calls, decision-email send + send-status recording) lives in
// lib/admin/waitlist-decisions.ts — shared verbatim with PATCH
// /api/admin/email-captures/[id] (2026-09-22, see DECISIONS.md) so an
// email capture promoted to a Waitlist row and a card/site application
// go through the exact same code, not a parallel copy of it. This route
// is now just request parsing + response shaping; see that file's own
// comment for the full history (A5/A6/A7) this used to carry inline.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.user;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "decline" && body.action !== "hold" && body.action !== "resend") {
    return NextResponse.json({ error: 'action must be "approve", "decline", "hold", or "resend".' }, { status: 422 });
  }

  const application = await prisma.waitlist.findUnique({ where: { id: params.id } });
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const result =
    body.action === "approve"
      ? await approveWaitlistEntry(application, admin.id, Boolean(body.ageVerified))
      : body.action === "hold"
        ? await holdWaitlistEntry(application, admin.id, body.heldReason, body.heldNote)
        : body.action === "decline"
          ? await declineWaitlistEntry(application, admin.id)
          : await resendApprovalEmail(application);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({ ok: true, ...("status" in result ? { status: result.status } : {}), ...("emailSent" in result ? { emailSent: result.emailSent } : {}) });
}
