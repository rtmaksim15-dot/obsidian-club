import { NextResponse } from "next/server";
import type { ApplicationHoldReason } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { track } from "@/lib/analytics/track";
import { generateInviteToken } from "@/lib/utils/codes";
import { computeValidUntil, HARD_CAP_DAYS } from "@/lib/invites/lifecycle";
import { sendApplicationAcceptedEmail, sendApplicationDeclinedEmail } from "@/lib/utils/email";

type Action = "approve" | "decline" | "hold" | "resend";
const VALID_HOLD_REASONS: ApplicationHoldReason[] = ["order_not_confirmed", "age_check_needed", "needs_follow_up", "waiting"];

type Body = { action?: Action; ageVerified?: boolean; heldReason?: string; heldNote?: string };

// PATCH /api/admin/applications/:id — approve, decline, or hold a
// waitlist entry.
//
// A5 (2026-09-09, see DECISIONS.md): added Hold as a third, non-terminal
// outcome alongside the existing approve/decline. A held application
// isn't a final decision — it can still move to approved/declined
// later, so the status guard below accepts both "pending" and "held" as
// startable states. `heldReason`/`heldNote` hold the CURRENT hold
// reason (overwritten on a repeat Hold, not appended — see
// ApplicationHoldReason's schema comment); `reviewedAt`/`reviewedBy`
// double as "who/when last touched this," same as they already did for
// approve/decline, and `heldAt` marks specifically when this hold
// happened.
//
// A6 (2026-09-09, see DECISIONS.md): Accept now mints a real InviteToken
// (source: "application") via Waitlist.applicationTokenId — NOT the
// legacy `inviteToken` hex field / /invite/[token] path, which is
// frozen for its one outstanding real link and never written for new
// records again (see app/api/invite/[token]/route.ts's own comment).
// A token is created only here, only on Accept, never before and never
// by any other route. Redemption goes through /join/[token], same as
// purchase_card/member/partner already do — evaluateTokenLifecycle and
// that route's transaction are untouched, no new branch needed there
// for this source (source only matters for attribution — see
// app/api/join/[token]/route.ts's existing member/partner conditionals,
// which "application" simply doesn't match, same as purchase_card
// today). No REP award, no Referral row — matching that existing
// precedent, not the old /invite/[token] flow's behavior.
//
// clientWindowDays is set equal to HARD_CAP_DAYS for this source: since
// firstScannedAt (whenever set) is always >= createdAt, validUntil
// (createdAt + HARD_CAP_DAYS) is always <= firstScannedAt +
// HARD_CAP_DAYS, so computeClientExpiresAt() always resolves to
// validUntil — the flat hard cap from issuance is what governs expiry,
// the 7-day client-scan-window mechanic never actually binds. This is
// "no scan/arming window for this source" achieved without
// special-casing the shared arming logic in /join/[token] that every
// source uses.
//
// The admin no longer sees or handles the token at all — no inviteUrl
// in the response, nothing to copy. It's emailed directly (A7 below).
//
// A7 (2026-09-09, see DECISIONS.md): email is now the only door. Accept
// sends sendApplicationAcceptedEmail with the token link; Decline sends
// sendApplicationDeclinedEmail with no reason (PRODUCT.md §1). Both
// record success/failure onto Waitlist.decisionEmailSentAt/
// decisionEmailSendError (added back in A1 for exactly this) so a
// failed send is a queryable, surfaced fact, not a silent one — see
// ApplicationsQueue.tsx for how it's shown. "resend" reuses the
// existing InviteToken via applicationTokenId and never mints a new
// one; it's the only action with a different status precondition
// (must already be "approved"), so it's checked before the general
// pending/held guard below.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

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

  if (body.action === "resend") {
    if (application.status !== "approved") {
      return NextResponse.json({ error: "Only an approved application can be resent." }, { status: 422 });
    }
    if (!application.applicationTokenId) {
      return NextResponse.json({ error: "No token to resend." }, { status: 422 });
    }
    const token = await prisma.inviteToken.findUnique({ where: { id: application.applicationTokenId } });
    if (!token) {
      return NextResponse.json({ error: "Token not found." }, { status: 404 });
    }
    const result = await sendApplicationAcceptedEmail(application.email, token.token);
    await prisma.waitlist.update({
      where: { id: application.id },
      data: result.ok
        ? { decisionEmailSentAt: new Date(), decisionEmailSendError: null }
        : { decisionEmailSendError: result.error ?? "Unknown error" },
    });
    return NextResponse.json({ ok: true, emailSent: result.ok });
  }

  if (application.status !== "pending" && application.status !== "held") {
    return NextResponse.json(
      { error: `Already ${application.status}.` },
      { status: 409 }
    );
  }

  if (body.action === "hold") {
    const heldReason = body.heldReason as ApplicationHoldReason;
    if (!heldReason || !VALID_HOLD_REASONS.includes(heldReason)) {
      return NextResponse.json({ error: "A hold reason is required." }, { status: 422 });
    }
    await prisma.waitlist.update({
      where: { id: application.id },
      data: {
        status: "held",
        heldReason,
        heldNote: body.heldNote?.trim() || null,
        heldAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: admin.id,
      },
    });
    return NextResponse.json({ ok: true, status: "held" });
  }

  if (body.action === "decline") {
    // PRODUCT.md §1: declines carry no explanation — that opacity is
    // intentional; sendApplicationDeclinedEmail gives no reason either.
    await prisma.waitlist.update({
      where: { id: application.id },
      data: { status: "declined", reviewedAt: new Date(), reviewedBy: admin.id },
    });
    // SPEC-analytics-panel.md §2.2 lists `meta: { reason }` for this
    // type, but this flow deliberately never captures a decline reason
    // (PRODUCT.md §1: declines carry no explanation) — nothing real to
    // put there, so it's omitted rather than faked.
    await track({ userId: null, type: "waitlist.rejected", entity: "invite", entityId: application.id });

    const result = await sendApplicationDeclinedEmail(application.email);
    await prisma.waitlist.update({
      where: { id: application.id },
      data: result.ok
        ? { decisionEmailSentAt: new Date(), decisionEmailSendError: null }
        : { decisionEmailSendError: result.error ?? "Unknown error" },
    });

    return NextResponse.json({ ok: true, status: "declined", emailSent: result.ok });
  }

  // --- approve: mint a real InviteToken, never the legacy hex field ---
  const ageVerified = Boolean(body.ageVerified);
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
    where: { id: application.id },
    data: {
      status: "approved",
      reviewedAt: now,
      reviewedBy: admin.id,
      ageVerified,
      ageVerifiedAt: ageVerified ? now : null,
      applicationTokenId: token.id,
    },
  });

  const waitDays = Math.floor((now.getTime() - application.createdAt.getTime()) / 86_400_000);
  await track({
    userId: null,
    type: "waitlist.approved",
    entity: "invite",
    entityId: application.id,
    meta: { reviewedBy: admin.id, waitDays },
  });

  const result = await sendApplicationAcceptedEmail(application.email, token.token);
  await prisma.waitlist.update({
    where: { id: application.id },
    data: result.ok
      ? { decisionEmailSentAt: new Date(), decisionEmailSendError: null }
      : { decisionEmailSendError: result.error ?? "Unknown error" },
  });

  return NextResponse.json({ ok: true, status: "approved", emailSent: result.ok });
}
