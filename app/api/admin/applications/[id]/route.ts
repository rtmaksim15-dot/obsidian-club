import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  approveWaitlistEntry,
  holdWaitlistEntry,
  declineWaitlistEntry,
  resendApprovalEmail,
} from "@/lib/admin/waitlist-decisions";

type Action = "approve" | "decline" | "hold" | "resend";

type Body = { action?: Action; ageVerified?: boolean; heldReason?: string; heldNote?: string };

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
