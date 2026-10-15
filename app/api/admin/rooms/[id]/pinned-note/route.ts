import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";

const MAX_LENGTH = 500;

type Body = { pinnedNote?: string | null };

// PATCH /api/admin/rooms/:id/pinned-note — Clean Hall, B4 (Package 5,
// Phase B, 2026-10-14, see DECISIONS.md). Admin-only. An empty/null
// body clears it (unpins).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.user;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const pinnedNote = body.pinnedNote?.trim() || null;
  if (pinnedNote && pinnedNote.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Pinned note must be ${MAX_LENGTH} characters or fewer.` }, { status: 422 });
  }

  const room = await prisma.room.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  await prisma.room.update({ where: { id: params.id }, data: { pinnedNote } });

  await logModerationAction({
    adminId: admin.id,
    action: "room.pinned_note_changed",
    targetType: "room",
    targetId: room.id,
    note: pinnedNote ? `Set to: "${pinnedNote.slice(0, 200)}"` : "Cleared",
  });

  return NextResponse.json({ ok: true, pinnedNote });
}
