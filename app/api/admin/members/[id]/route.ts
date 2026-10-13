import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";

type Body = { ageVerified?: boolean; removeAvatar?: boolean; removeAvatarReason?: string; isTest?: boolean };

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

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // Profile lite, B7 (Package 4, Phase B, 2026-10-13, see DECISIONS.md)
  // — a second, distinct action on this same route: soft-removes an
  // explicit avatar (sets avatarUrl null; the original file in Storage
  // is untouched — same "don't hard-delete" posture as every other
  // moderation action in this app). A reason is required so the
  // ModerationAction row actually explains itself later.
  if (body.removeAvatar === true) {
    const reason = body.removeAvatarReason?.trim();
    if (!reason) {
      return NextResponse.json({ error: "A reason is required." }, { status: 422 });
    }
    await prisma.user.update({ where: { id: params.id }, data: { avatarUrl: null } });
    await logModerationAction({
      adminId: admin.id,
      action: "member.avatar_removed",
      targetType: "user",
      targetId: member.id,
      note: reason,
    });
    return NextResponse.json({ ok: true });
  }

  // Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
  // a third, distinct action: marks/unmarks a "Test account." Never
  // deletes or alters anything else about the account — it only flips
  // this one flag, which every non-admin-facing query then uses to
  // exclude the account (and everything it authored) from its results.
  if (typeof body.isTest === "boolean") {
    await prisma.user.update({ where: { id: params.id }, data: { isTest: body.isTest } });
    await logModerationAction({
      adminId: admin.id,
      action: "member.is_test_changed",
      targetType: "user",
      targetId: member.id,
      note: `isTest: ${member.isTest} -> ${body.isTest}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.ageVerified !== "boolean") {
    return NextResponse.json({ error: "ageVerified must be a boolean." }, { status: 422 });
  }

  const previousValue = member.ageVerified;

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ageVerified: body.ageVerified,
      ageVerifiedAt: body.ageVerified ? new Date() : null,
      ageVerifiedThreshold: body.ageVerified ? MIN_MEMBER_AGE : null,
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
