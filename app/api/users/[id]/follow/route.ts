import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// POST /api/users/:id/follow — toggles the caller's follow relationship
// on another member. Same toggle shape as /api/posts/:id/like. The Feed
// stays club-wide chronological for v1 — this only powers the
// follower/following counts and button state on public profiles, not
// feed filtering (see BACKLOG.md).
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  if (user.id === params.id) {
    return NextResponse.json({ error: "You can't follow yourself." }, { status: 422 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.status !== "active") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
  });

  try {
    if (existing) {
      await prisma.follow.delete({
        where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
      });
      return NextResponse.json({ following: false });
    }

    await prisma.follow.create({ data: { followerId: user.id, followingId: target.id } });
    return NextResponse.json({ following: true });
  } catch (err) {
    console.error("[users/follow] Failed to toggle follow:", err);
    return NextResponse.json({ error: "Could not update. Try again shortly." }, { status: 503 });
  }
}
