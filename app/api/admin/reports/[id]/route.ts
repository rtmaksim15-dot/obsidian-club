import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

type Action = "dismiss" | "review" | "preserve";
const VALID_ACTIONS: Action[] = ["dismiss", "review", "preserve"];

// PATCH /api/admin/reports/:id — the only way an open report changes
// state (member protection mechanics, pre-launch legal package,
// 2026-08-09). "preserve" is the red-line path: the reported post is
// unpublished AND marked `isPreserved` — never deleted, since deleting
// destroys the evidence a red-line report exists to capture. Every
// action is logged to ModerationAction — who, when, what, against
// which report's category.
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
