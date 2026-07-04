import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessRoom } from "@/lib/rating/room-access";

// GET /api/rooms — all active rooms, annotated with whether the caller
// can access each. Locked rooms are included, not filtered out — per
// DESIGN.md: "Заблокированные комнаты видны, но с замком."
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    rooms: rooms.map((room) => ({
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      type: room.type,
      minLevel: room.minLevel,
      city: room.city,
      locked: !canAccessRoom(user, room),
    })),
  });
}
