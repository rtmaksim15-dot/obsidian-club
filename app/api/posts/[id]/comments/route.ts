import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { track } from "@/lib/analytics/track";

const commentSelect = {
  id: true,
  content: true,
  isDeleted: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
};

// GET /api/posts/:id/comments — flat, chronological (oldest first, like
// a real conversation thread) list of a post's comments.
//
// Moderation gap 1 (2026-09-08, see DECISIONS.md): a removed comment
// stays IN this list as a tombstone rather than being filtered out —
// deleting a thread's replies alongside it would make the surviving
// conversation read as a non-sequitur, and "the thread reading
// coherently matters more than tidiness" per that decision. The real
// content is redacted here, server-side, before it ever reaches a
// non-admin response — `isDeleted: true` is the client's cue to render
// a placeholder (see CommentSection.tsx), never the raw content.
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
    where: { postId: post.id },
    orderBy: { createdAt: "asc" },
    select: commentSelect,
  });

  const redacted = comments.map((c) => (c.isDeleted ? { ...c, content: "" } : c));

  return NextResponse.json({ comments: redacted });
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
