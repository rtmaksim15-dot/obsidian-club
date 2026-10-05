import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";
import { REPORT_CATEGORIES } from "@/lib/moderation/report";
import { requiresMandatoryRetention } from "@/lib/moderation/retention";

const KNOWN_CATEGORIES = REPORT_CATEGORIES.map((c) => c.value as string);

// DELETE /api/admin/comments/:id — admin-only soft-delete (moderation
// gap 1, 2026-09-08, see DECISIONS.md). Never hard-deletes: content
// survives as evidence, only `isDeleted` flips (already the read-path
// filter everywhere comments are listed) plus who/when. No member-
// facing equivalent exists or is planned — this is the only way a
// comment is ever removed.
//
// Security package 4, FIX 13 (2026-10-05, see DECISIONS.md) — optional
// `category` body field, same reasoning as the messages route's
// identical addition.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let category: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.category === "string" && KNOWN_CATEGORIES.includes(body.category)) {
      category = body.category;
    }
  } catch {
    // No body, or not JSON — category stays optional, same as before.
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
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: admin.id,
      preserveIndefinitely: requiresMandatoryRetention(category),
    },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "comment.removed",
    targetType: "comment",
    targetId: comment.id,
    aupSection: category,
    note: `Removed comment on post ${comment.postId}: "${comment.content.slice(0, 200)}"`,
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/comments/:id — admin-only restore (task 1,
// 2026-09-22, see DECISIONS.md). Mirrors the DELETE handler above:
// clears isDeleted and the deletedAt/deletedById pair (a restored
// comment shouldn't still carry "who removed it" once it's back), logs
// its own ModerationAction — the removal's own log row is untouched,
// so the full remove-then-restore history stays readable.
export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const comment = await prisma.comment.findUnique({ where: { id: params.id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }
  if (!comment.isDeleted) {
    return NextResponse.json({ error: "This comment isn't removed." }, { status: 409 });
  }

  await prisma.comment.update({
    where: { id: comment.id },
    data: { isDeleted: false, deletedAt: null, deletedById: null },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "comment.restored",
    targetType: "comment",
    targetId: comment.id,
    note: `Restored comment on post ${comment.postId}.`,
  });

  return NextResponse.json({ ok: true });
}
