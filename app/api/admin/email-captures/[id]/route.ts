import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { approveWaitlistEntry, holdWaitlistEntry, declineWaitlistEntry } from "@/lib/admin/waitlist-decisions";

type Action = "approve" | "decline" | "hold";

type Body = { action?: Action; ageVerified?: boolean; heldReason?: string; heldNote?: string };

// PATCH /api/admin/email-captures/:id — Accept/Hold/Decline an
// EmailCapture row (2026-09-22, see DECISIONS.md).
//
// No parallel pipeline: this finds (or, on the first action taken
// against this capture, lazily creates) the Waitlist row for the
// capture's email — origin "email_capture" for a new row — then calls
// the exact same approve/hold/decline functions
// (lib/admin/waitlist-decisions.ts) that PATCH
// /api/admin/applications/[id] calls for a card/site application. From
// that point on this row IS a normal Waitlist row: same status values,
// same InviteToken/doors-open access rules on Accept, same decision-
// email send-tracking (and "Failed Sends" surfacing) on Accept/Decline,
// and it's independently reachable/manageable (including resend) from
// the existing Applications zone, since it now matches that zone's own
// query. If the capture's email already has a Waitlist row (e.g. the
// same person separately applied through the invitation panel), that
// existing row is reused rather than creating a second one for the same
// email — Waitlist.email is unique, and this keeps one person's record
// as one row regardless of which path they used.
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

  const capture = await prisma.emailCapture.findUnique({ where: { id: params.id } });
  if (!capture) {
    return NextResponse.json({ error: "Email capture not found." }, { status: 404 });
  }

  let entry = await prisma.waitlist.findUnique({ where: { email: capture.email } });
  if (!entry) {
    entry = await prisma.waitlist.create({ data: { email: capture.email, origin: "email_capture" } });
  }

  const result =
    body.action === "approve"
      ? await approveWaitlistEntry(entry, admin.id, Boolean(body.ageVerified))
      : body.action === "hold"
        ? await holdWaitlistEntry(entry, admin.id, body.heldReason, body.heldNote)
        : await declineWaitlistEntry(entry, admin.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({
    ok: true,
    waitlistId: entry.id,
    ...("status" in result ? { status: result.status } : {}),
    ...("emailSent" in result ? { emailSent: result.emailSent } : {}),
  });
}
