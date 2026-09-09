import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApplicationHoldReason } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { track } from "@/lib/analytics/track";

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
// Approve/decline behavior themselves are unchanged in this step —
// still the legacy Waitlist.inviteToken/manual-copy-link path. That
// changes in A6.
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

  // --- approve: generate the one-time invite token, nothing else yet ---
  const inviteToken = randomBytes(24).toString("hex");
  const ageVerified = Boolean(body.ageVerified);

  await prisma.waitlist.update({
    where: { id: application.id },
    data: {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      inviteToken,
      ageVerified,
      ageVerifiedAt: ageVerified ? new Date() : null,
    },
  });

  const waitDays = Math.floor((Date.now() - application.createdAt.getTime()) / 86_400_000);
  await track({
    userId: null,
    type: "waitlist.approved",
    entity: "invite",
    entityId: application.id,
    meta: { reviewedBy: admin.id, waitDays },
  });

  const { origin } = new URL(request.url);
  return NextResponse.json({
    ok: true,
    status: "approved",
    inviteUrl: `${origin}/invite/${inviteToken}`,
  });
}
