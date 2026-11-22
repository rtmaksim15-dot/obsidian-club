import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";

// GET /api/admin/members/:id/delete-preview (2026-11-22, see
// DECISIONS.md) — counts shown to the admin before they confirm
// account deletion, so "shows counts of what will be removed" is a
// real preview, not a guess. Deliberately a separate, on-demand route
// rather than extra fields on every Person — these are a handful of
// count() queries nobody needs until they actually click Delete.
//
// Only counts rows that DELETE /api/admin/members/:id will either
// delete outright or (moderationActionsAsAdmin) anonymize — everything
// else referencing this user is either CASCADE-deleted or SET NULL by
// the live DB automatically and isn't "content" an admin needs to
// weigh (confirmed against pg_constraint before writing either route
// — see DECISIONS.md for the full FK audit).
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const member = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const [
    posts,
    comments,
    messages,
    directMessageThreads,
    reviews,
    reportsFiled,
    legalConsents,
    ageVerifications,
    adminNotesAuthored,
    bonds,
    pushSubscriptions,
    moderationActionsAsAdmin,
  ] = await Promise.all([
    prisma.post.count({ where: { authorId: member.id } }),
    prisma.comment.count({ where: { authorId: member.id } }),
    prisma.message.count({ where: { userId: member.id } }),
    prisma.thread.count({ where: { OR: [{ participantAId: member.id }, { participantBId: member.id }] } }),
    prisma.review.count({ where: { OR: [{ reviewerId: member.id }, { reviewedId: member.id }] } }),
    prisma.report.count({ where: { reporterId: member.id } }),
    prisma.legalConsent.count({ where: { userId: member.id } }),
    prisma.ageVerification.count({ where: { userId: member.id } }),
    prisma.adminNote.count({ where: { authorId: member.id } }),
    prisma.bond.count({ where: { OR: [{ fromUserId: member.id }, { toUserId: member.id }] } }),
    prisma.pushSubscription.count({ where: { userId: member.id } }),
    prisma.moderationAction.count({ where: { adminId: member.id } }),
  ]);

  return NextResponse.json({
    counts: {
      posts,
      comments,
      messages,
      directMessageThreads,
      reviews,
      reportsFiled,
      legalConsents,
      ageVerifications,
      adminNotesAuthored,
      bonds,
      pushSubscriptions,
      moderationActionsAsAdmin,
    },
  });
}
