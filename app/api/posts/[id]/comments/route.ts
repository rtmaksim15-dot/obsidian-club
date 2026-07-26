import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
};

// GET /api/posts/:id/comments — flat, chronological (oldest first, like
// a real conversation thread) list of a post's comments.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || !post.isPublished || post.minLevel > user.level) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { postId: post.id, isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: commentSelect,
  });

  return NextResponse.json({ comments });
}

type Body = { content?: string };

// POST /api/posts/:id/comments — add a comment. No nesting/replies —
// task spec is a flat list, and PRODUCT.md doesn't document threaded
// comments anywhere.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || !post.isPublished || post.minLevel > user.level) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 422 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Comment is too long." }, { status: 422 });
  }

  const comment = await prisma.comment.create({
    data: { postId: post.id, authorId: user.id, content },
    select: commentSelect,
  });

  await track({
    userId: user.id,
    type: "post.replied",
    entity: "post",
    entityId: post.id,
    meta: { parentId: post.id },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
