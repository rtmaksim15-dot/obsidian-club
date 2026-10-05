import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";
import { REPORT_CATEGORIES } from "@/lib/moderation/report";
import { requiresMandatoryRetention } from "@/lib/moderation/retention";

const KNOWN_CATEGORIES = REPORT_CATEGORIES.map((c) => c.value as string);

// DELETE /api/admin/messages/:id — admin-only soft-delete (moderation
// gap 1, 2026-09-08, see DECISIONS.md). Same shape as the comment
// route: never hard-deletes, sets isDeleted + who/when, no member-
// facing equivalent. Note for RoomChat.tsx: its Realtime subscription
// only listens for INSERT on `messages` (see that component's own
// comment), so this UPDATE won't push live to open chat sessions —
// members see the tombstone on their next fetch, not instantly. Fixing
// that is a Realtime/member-facing UI change, out of scope here.
//
// Security package 4, FIX 13 (2026-10-05, see DECISIONS.md) — optional
// `category` body field, added ahead of any UI actually calling this
// route with one (today only PATCH/restore is wired, from
// ReportDetail.tsx — this DELETE path has no caller yet). Without it,
// a removal through this route has no classification signal at all and
// defaults to NOT red-line, same as before this change.
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

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (message.isDeleted) {
    return NextResponse.json({ error: "This message has already been removed." }, { status: 409 });
  }

  await prisma.message.update({
    where: { id: message.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedById: admin.id,
      preserveIndefinitely: requiresMandatoryRetention(category),
    },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "message.removed",
    targetType: "message",
    targetId: message.id,
    aupSection: category,
    note: `Removed message in room ${message.roomId}: "${message.content.slice(0, 200)}"`,
  });

  return NextResponse.json({ ok: true });
}

// PATCH /api/admin/messages/:id — admin-only restore (task 1,
// 2026-09-22, see DECISIONS.md). Same shape as comments' own restore:
// clears isDeleted and deletedAt/deletedById, logs its own
// ModerationAction. Same Realtime caveat as the DELETE handler above —
// a restore also won't push live, members see it on next fetch.
export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const message = await prisma.message.findUnique({ where: { id: params.id } });
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }
  if (!message.isDeleted) {
    return NextResponse.json({ error: "This message isn't removed." }, { status: 409 });
  }

  await prisma.message.update({
    where: { id: message.id },
    data: { isDeleted: false, deletedAt: null, deletedById: null },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "message.restored",
    targetType: "message",
    targetId: message.id,
    note: `Restored message in room ${message.roomId}.`,
  });

  return NextResponse.json({ ok: true });
}
