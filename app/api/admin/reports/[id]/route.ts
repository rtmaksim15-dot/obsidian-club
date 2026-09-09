import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

type Action = "dismiss" | "review" | "preserve" | "remove";
const VALID_ACTIONS: Action[] = ["dismiss", "review", "preserve", "remove"];

// PATCH /api/admin/reports/:id — the only way an open report changes
// state (member protection mechanics, pre-launch legal package,
// 2026-08-09). "preserve" is the red-line path: the reported post is
// unpublished AND marked `isPreserved` — never deleted, since deleting
// destroys the evidence a red-line report exists to capture. "remove"
// (moderation gap 2 follow-up, 2026-09-08, see DECISIONS.md) is the
// comment/message equivalent — reviewing the report and removing the
// content are the same moment of work, so this does both in one call
// rather than making the admin go soft-delete it separately via
// DELETE /api/admin/comments|messages/:id (that route still exists and
// still works on its own; this is a second caller of the same shape,
// not a replacement). Every action is logged to ModerationAction — who,
// when, what, against which report's category.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const action = body.action as Action;
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 422 });
  }

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  if (report.status !== "open") {
    return NextResponse.json({ error: "This report has already been reviewed." }, { status: 422 });
  }

  if (action === "preserve") {
    if (report.targetType !== "post") {
      return NextResponse.json({ error: "Preserve only applies to post reports." }, { status: 422 });
    }
    await prisma.post.update({
      where: { id: report.targetId },
      data: { isPublished: false, isPreserved: true },
    });
    await logModerationAction({
      adminId: admin.id,
      action: "post.preserved",
      targetType: "post",
      targetId: report.targetId,
      aupSection: report.category,
      note: `Preserved via report ${report.id} (${report.category}).`,
    });
  } else if (action === "remove") {
    if (report.targetType !== "comment" && report.targetType !== "message") {
      return NextResponse.json({ error: "Remove only applies to comment or message reports." }, { status: 422 });
    }
    if (report.targetType === "comment") {
      const comment = await prisma.comment.findUnique({ where: { id: report.targetId } });
      if (!comment) {
        return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 });
      }
      if (!comment.isDeleted) {
        await prisma.comment.update({
          where: { id: comment.id },
          data: { isDeleted: true, deletedAt: new Date(), deletedById: admin.id },
        });
        await logModerationAction({
          adminId: admin.id,
          action: "comment.removed",
          targetType: "comment",
          targetId: comment.id,
          aupSection: report.category,
          note: `Removed via report ${report.id} (${report.category}): "${comment.content.slice(0, 200)}"`,
        });
      }
    } else {
      const message = await prisma.message.findUnique({ where: { id: report.targetId } });
      if (!message) {
        return NextResponse.json({ error: "That message no longer exists." }, { status: 404 });
      }
      if (!message.isDeleted) {
        await prisma.message.update({
          where: { id: message.id },
          data: { isDeleted: true, deletedAt: new Date(), deletedById: admin.id },
        });
        await logModerationAction({
          adminId: admin.id,
          action: "message.removed",
          targetType: "message",
          targetId: message.id,
          aupSection: report.category,
          note: `Removed via report ${report.id} (${report.category}): "${message.content.slice(0, 200)}"`,
        });
      }
    }
  } else {
    await logModerationAction({
      adminId: admin.id,
      action: action === "dismiss" ? "report.dismissed" : "report.reviewed",
      targetType: report.targetType,
      targetId: report.targetId,
      aupSection: report.category,
      note: `Report ${report.id}.`,
    });
  }

  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: action === "dismiss" ? "dismissed" : "reviewed",
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  return NextResponse.json({ ok: true });
}
