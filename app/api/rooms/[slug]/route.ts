import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessRoom } from "@/lib/rating/room-access";

// GET /api/rooms/:slug — room detail. ARCHITECTURE.md §4 shows this as
// /api/rooms/:id; this app uses the room's slug in the URL instead of
// its UUID (nicer URLs, same shape otherwise) — see docs/API/rooms.md.
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const room = await prisma.room.findUnique({ where: { slug: params.slug } });
  if (!room || !room.isActive) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const locked = !canAccessRoom(user, room);

  return NextResponse.json({
    room: {
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      type: room.type,
      minLevel: room.minLevel,
      city: room.city,
      locked,
    },
  });
}
