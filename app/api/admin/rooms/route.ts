import { NextResponse } from "next/server";
import { RoomType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

type Body = {
  name?: string;
  slug?: string;
  description?: string;
  type?: string;
  minLevel?: number;
  city?: string;
  country?: string;
};

const VALID_TYPES = Object.values(RoomType);

// POST /api/admin/rooms — creates a room. Exists mainly so admins can add
// thematic rooms with real topics; only structurally-documented rooms
// (general/newcomers/named local circles) are seeded — see
// prisma/seed.ts and DECISIONS.md, 2026-07-03.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim();
  const type = body.type;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 422 });
  if (!slug || !/^[a-z0-9-]{2,50}$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be 2-50 characters: lowercase letters, numbers, hyphens." },
      { status: 422 }
    );
  }
  if (!type || !(VALID_TYPES as string[]).includes(type)) {
    return NextResponse.json({ error: "Invalid room type." }, { status: 422 });
  }

  try {
    const room = await prisma.room.create({
      data: {
        name,
        slug,
        description: body.description?.trim() || null,
        type: type as (typeof VALID_TYPES)[number],
        minLevel: body.minLevel ?? 1,
        city: body.city?.trim() || null,
        country: body.country?.trim() || null,
      },
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (err: unknown) {
    const isUniqueViolation =
      typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueViolation) {
      return NextResponse.json({ error: "That slug is already taken." }, { status: 409 });
    }
    console.error("[admin/rooms] Failed to create room:", err);
    return NextResponse.json({ error: "Could not create the room." }, { status: 503 });
  }
}
