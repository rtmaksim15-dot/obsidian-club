import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const postSelect = {
  id: true,
  title: true,
  content: true,
  mediaUrls: true,
  type: true,
  minLevel: true,
  authorId: true,
  viewsCount: true,
  likesCount: true,
  createdAt: true,
  publishedAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
  _count: { select: { comments: true } },
};

// GET /api/posts/:id
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id }, select: postSelect });
  if (!post || !post.author) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.minLevel > user.level) {
    return NextResponse.json({ error: "This content isn't open to you yet." }, { status: 403 });
  }

  return NextResponse.json({ post });
}

type Body = { title?: string; content?: string };

// PATCH /api/posts/:id — author-only edit of title/content. Type,
// minLevel, and publish state aren't editable after creation — no
// documented workflow for changing them, so this doesn't invent one.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: "You can only edit your own content." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (content !== undefined && !content) {
    return NextResponse.json({ error: "Content can't be empty." }, { status: 422 });
  }
  if (content && content.length > 20000) {
    return NextResponse.json({ error: "Content is too long." }, { status: 422 });
  }
  // CLAUDE.md (2026-07-05): no external links in posts — same rule as
  // creation, see app/api/posts/route.ts.
  if (content && /(https?:\/\/|www\.)\S+/i.test(content)) {
    return NextResponse.json({ error: "External links aren't allowed in posts." }, { status: 422 });
  }

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() || null } : {}),
      ...(content ? { content } : {}),
    },
    select: postSelect,
  });

  return NextResponse.json({ post: updated });
}

// DELETE /api/posts/:id — author or admin.
//
// Moderation gap 3 (2026-09-08, see DECISIONS.md): an author can no
// longer delete their own post while it has an open report — deleting
// it (a real, cascading hard delete of the post and every comment/like
// on it) would take the evidence a report exists to preserve with it.
// Deliberately narrow: only blocks the AUTHOR path. Admin deletion is
// unchanged — the correct admin action on a reported post is `preserve`
// via /admin/reports (PATCH /api/admin/reports/:id), not this route,
// but this route doesn't enforce that choice for admins. Says the post
// is under review, not why, matching every other report-adjacent
// member-facing message in this codebase.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.authorId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "You can only delete your own content." }, { status: 403 });
  }
  if (post.authorId === user.id && !user.isAdmin) {
    const openReport = await prisma.report.findFirst({
      where: { targetType: "post", targetId: post.id, status: "open" },
      select: { id: true },
    });
    if (openReport) {
      return NextResponse.json({ error: "This post is under review and can't be deleted right now." }, { status: 409 });
    }
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
