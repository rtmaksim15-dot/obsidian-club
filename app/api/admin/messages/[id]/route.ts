import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

// DELETE /api/admin/messages/:id — admin-only soft-delete (moderation
// gap 1, 2026-09-08, see DECISIONS.md). Same shape as the comment
// route: never hard-deletes, sets isDeleted + who/when, no member-
// facing equivalent. Note for RoomChat.tsx: its Realtime subscription
// only listens for INSERT on `messages` (see that component's own
// comment), so this UPDATE won't push live to open chat sessions —
// members see the tombstone on their next fetch, not instantly. Fixing
// that is a Realtime/member-facing UI change, out of scope here.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.isDeleted) {
    return NextResponse.json({ error: "This message has already been removed." }, { status: 409 });
  }

  await prisma.message.update({
    where: { id: message.id },
    data: { isDeleted: true, deletedAt: new Date(), deletedById: admin.id },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "message.removed",
    targetType: "message",
    targetId: message.id,
    note: `Removed message in room ${message.roomId}: "${message.content.slice(0, 200)}"`,
  });

  return NextResponse.json({ ok: true });
}
