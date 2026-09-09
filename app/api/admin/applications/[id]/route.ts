import { NextResponse } from "next/server";
import type { ApplicationHoldReason } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { track } from "@/lib/analytics/track";
import { generateInviteToken } from "@/lib/utils/codes";
import { computeValidUntil, HARD_CAP_DAYS } from "@/lib/invites/lifecycle";

type Action = "approve" | "decline" | "hold";
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
// in the response, nothing to copy. Email sending is A7, next; this
// step only retires the manual-copy path and issues the token.
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

  if (body.action !== "approve" && body.action !== "decline" && body.action !== "hold") {
    return NextResponse.json({ error: 'action must be "approve", "decline", or "hold".' }, { status: 422 });
  }

  const application = await prisma.waitlist.findUnique({ where: { id: params.id } });
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
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
    // intentional, so no email is sent here.
    await prisma.waitlist.update({
      where: { id: application.id },
      data: { status: "declined", reviewedAt: new Date(), reviewedBy: admin.id },
    });
    // SPEC-analytics-panel.md §2.2 lists `meta: { reason }` for this
    // type, but this flow deliberately never captures a decline reason
    // (PRODUCT.md §1: declines carry no explanation) — nothing real to
    // put there, so it's omitted rather than faked.
    await track({ userId: null, type: "waitlist.rejected", entity: "invite", entityId: application.id });
    return NextResponse.json({ ok: true, status: "declined" });
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

  return NextResponse.json({ ok: true, status: "approved" });
}
