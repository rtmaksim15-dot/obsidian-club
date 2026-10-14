import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canDeleteOwnMessage } from "@/lib/rooms/own-message-delete";

// DELETE /api/rooms/messages/:id — a member soft-deletes their OWN
// room message (Package 5, Phase B follow-up, 2026-10-14, see
// DECISIONS.md). Same soft-delete shape as the admin-only route
// (app/api/admin/messages/[id]/route.ts) — isDeleted/deletedAt/
// deletedById set, content never hard-deleted — but actor = the
// author themselves, not an admin, and gated by lib/rooms/
// own-message-delete.ts#canDeleteOwnMessage: never while the message
// is under an OPEN report (don't let evidence disappear mid-review),
// and never once it's been flagged for mandatory retention
// (`preserveIndefinitely` — in this codebase, only ever set by an
// admin red-line removal, alongside isDeleted: true in the same
// write, so today this is always already covered by the isDeleted
// check too; kept as its own explicit check anyway, matching the
// task's own instruction, and in case a future removal path ever sets
// it independently).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  const openReport = await prisma.report.findFirst({
    where: { targetType: "message", targetId: message.id, status: "open" },
    select: { id: true },
  });

  const check = canDeleteOwnMessage({
    isAuthor: message.userId === user.id,
    isDeleted: message.isDeleted,
    preserveIndefinitely: message.preserveIndefinitely,
    hasOpenReport: Boolean(openReport),
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  await prisma.message.update({
    where: { id: message.id },
    data: { isDeleted: true, deletedAt: new Date(), deletedById: user.id },
  });

  return NextResponse.json({ ok: true });
}
