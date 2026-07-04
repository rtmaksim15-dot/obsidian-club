import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// POST /api/posts/:id/like — toggles the caller's like on a post.
// `Post.likesCount` is a cached counter kept in sync here; the `Like`
// join table is the source of truth for who liked what.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || !post.isPublished) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.minLevel > user.level) {
    return NextResponse.json({ error: "This content isn't open to you yet." }, { status: 403 });
  }

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: post.id, userId: user.id } },
  });

  try {
    if (existing) {
      await prisma.$transaction([
        prisma.like.delete({ where: { postId_userId: { postId: post.id, userId: user.id } } }),
        prisma.post.update({ where: { id: post.id }, data: { likesCount: { decrement: 1 } } }),
      ]);
      return NextResponse.json({ liked: false });
    }

    await prisma.$transaction([
      prisma.like.create({ data: { postId: post.id, userId: user.id } }),
      prisma.post.update({ where: { id: post.id }, data: { likesCount: { increment: 1 } } }),
    ]);
    return NextResponse.json({ liked: true });
  } catch (err) {
    console.error("[posts/like] Failed to toggle like:", err);
    return NextResponse.json({ error: "Could not update like. Try again shortly." }, { status: 503 });
  }
}
