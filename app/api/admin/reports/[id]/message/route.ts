import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

// GET /api/admin/reports/:id/message — the only path by which an admin
// can ever see a DirectMessage's content (2026-09-14, see DECISIONS.md).
// Admins have no general browse/read access to threads or messages —
// no RLS policy grants it (server-side Prisma access already bypasses
// RLS entirely, same as every other admin route in this app, so this
// route itself IS the access control, not a policy), and admin/page.tsx's
// Zone 3 resolution for a direct_message report deliberately never
// selects the `content` column. Content is served only while the
// report is still open — reviewing or dismissing it closes this path
// too, same as every other report action being terminal. Every fetch
// is logged, unconditionally, before the response is built: an admin
// opening this and closing the tab without reading still counts as an
// access, which is the honest thing to log.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const report = await prisma.report.findUnique({ where: { id: params.id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  if (report.targetType !== "direct_message") {
    return NextResponse.json({ error: "This report isn't about a direct message." }, { status: 422 });
  }
  if (report.status !== "open") {
    return NextResponse.json({ error: "This report is no longer open." }, { status: 403 });
  }

  const message = await prisma.directMessage.findUnique({
    where: { id: report.targetId },
    select: {
      id: true,
      content: true,
      isDeleted: true,
      createdAt: true,
      threadId: true,
      sender: { select: { id: true, displayName: true, username: true } },
    },
  });
  if (!message) {
    return NextResponse.json({ error: "That message no longer exists." }, { status: 404 });
  }

  await logModerationAction({
    adminId: admin.id,
    action: "direct_message.viewed",
    targetType: "direct_message",
    targetId: message.id,
    aupSection: report.category,
    note: `Viewed via report ${report.id}.`,
  });

  return NextResponse.json({
    message: {
      id: message.id,
      content: message.isDeleted ? "" : message.content,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
    },
  });
}
