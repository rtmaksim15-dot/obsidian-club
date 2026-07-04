import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessRoom } from "@/lib/rating/room-access";

const PAGE_SIZE = 50;

async function loadRoomForAccess(slug: string) {
  return prisma.room.findUnique({ where: { slug } });
}

const messageSelect = {
  id: true,
  content: true,
  mediaUrl: true,
  replyToId: true,
  createdAt: true,
  user: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
};

// GET /api/rooms/:slug/messages — latest PAGE_SIZE messages, oldest-first
// ("История сообщений (снизу вверх)", DESIGN.md). No cursor pagination
// yet — see TECH_DEBT.md.
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const room = await loadRoomForAccess(params.slug);
  if (!room || !room.isActive) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (!canAccessRoom(user, room)) {
    return NextResponse.json({ error: "This room isn't open to you yet." }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { roomId: room.id, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: messageSelect,
  });

  return NextResponse.json({ messages: messages.reverse() });
}

type Body = { content?: string; replyToId?: string };

// POST /api/rooms/:slug/messages
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const room = await loadRoomForAccess(params.slug);
  if (!room || !room.isActive) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }
  if (!canAccessRoom(user, room)) {
    return NextResponse.json({ error: "This room isn't open to you yet." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 422 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 422 });
  }

  try {
    const message = await prisma.message.create({
      data: {
        roomId: room.id,
        userId: user.id,
        content,
        replyToId: body.replyToId,
      },
      select: messageSelect,
    });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("[rooms/messages] Failed to create message:", err);
    return NextResponse.json({ error: "Could not send. Try again shortly." }, { status: 503 });
  }
}
