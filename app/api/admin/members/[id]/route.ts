import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

type Body = { ageVerified?: boolean };

// PATCH /api/admin/members/:id — toggle Age Verification on an existing
// member (2026-08-03). Field first, no enforcement gate yet — see
// DECISIONS.md. Separate from the approval-time checkbox in
// app/api/admin/applications/[id]/route.ts, which stages the same flag
// on Waitlist for members who haven't redeemed their invite yet.
//
// Moderation gap 4 (2026-09-08, see DECISIONS.md): every toggle, both
// directions, now writes a ModerationAction with the previous and new
// value — this is the launch cohort's only age control and was
// previously unattributed (the bare overwrite left no record of who
// changed it or from what). The User row itself still only holds the
// current state (ageVerified/ageVerifiedAt) by design; ModerationAction
// is the append-only history — never overwritten, so a prior toggle's
// record survives every later one.
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

  if (typeof body.ageVerified !== "boolean") {
    return NextResponse.json({ error: "ageVerified must be a boolean." }, { status: 422 });
  }

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const previousValue = member.ageVerified;

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ageVerified: body.ageVerified,
      ageVerifiedAt: body.ageVerified ? new Date() : null,
    },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "member.age_verified_changed",
    targetType: "user",
    targetId: member.id,
    note: `ageVerified: ${previousValue} -> ${body.ageVerified}`,
  });

  return NextResponse.json({ ok: true });
}
