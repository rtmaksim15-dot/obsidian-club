import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

// DELETE /api/admin/comments/:id — admin-only soft-delete (moderation
// gap 1, 2026-09-08, see DECISIONS.md). Never hard-deletes: content
// survives as evidence, only `isDeleted` flips (already the read-path
// filter everywhere comments are listed) plus who/when. No member-
// facing equivalent exists or is planned — this is the only way a
// comment is ever removed.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (comment.isDeleted) {
    return NextResponse.json({ error: "This comment has already been removed." }, { status: 409 });
  }

  await prisma.comment.update({
    where: { id: comment.id },
    data: { isDeleted: true, deletedAt: new Date(), deletedById: admin.id },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "comment.removed",
    targetType: "comment",
    targetId: comment.id,
    note: `Removed comment on post ${comment.postId}: "${comment.content.slice(0, 200)}"`,
  });

  return NextResponse.json({ ok: true });
}
