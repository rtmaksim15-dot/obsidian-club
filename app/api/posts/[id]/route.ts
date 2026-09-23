import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveAvatarUrl, resolvePostMediaUrls } from "@/lib/storage/resolve-media";

const postSelect = {
  id: true,
  title: true,
  content: true,
  mediaUrls: true,
  type: true,
  minLevel: true,
  isPublished: true,
  authorId: true,
  viewsCount: true,
  likesCount: true,
  createdAt: true,
  publishedAt: true,
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
  _count: { select: { comments: true } },
};

// GET /api/posts/:id
//
// Security fix (2026-09-23, see DECISIONS.md): this used to skip the
// isPublished check every sibling route (the feed, GET /api/posts,
// GET /api/posts/:id/comments, the /posts/:id page) already applies.
// A red-line-reported post is preserved as moderation evidence by
// setting isPublished:false (see Post.isPreserved's schema comment) —
// the post's own id was live in the feed/notifications/a reporter's
// link before that happened, so it's not a secret, and this route was
// the one place still willing to hand back full content + author
// identity for it to any member who had or found that id. Treated as a
// 404, same as the minLevel/not-found cases — not confirming
// existence — for everyone except an admin, who still needs to reach
// this for legitimate moderation review.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id }, select: postSelect });
  if (!post || !post.author) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (!post.isPublished && !user.isAdmin) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (post.minLevel > user.level) {
    return NextResponse.json({ error: "This content isn't open to you yet." }, { status: 403 });
  }

  const [mediaUrls, avatarUrl] = await Promise.all([
    resolvePostMediaUrls(post.mediaUrls),
    resolveAvatarUrl(post.author.avatarUrl),
  ]);
  return NextResponse.json({ post: { ...post, mediaUrls, author: { ...post.author, avatarUrl } } });
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

  const [mediaUrls, avatarUrl] = await Promise.all([
    resolvePostMediaUrls(updated.mediaUrls),
    resolveAvatarUrl(updated.author.avatarUrl),
  ]);
  return NextResponse.json({ post: { ...updated, mediaUrls, author: { ...updated.author, avatarUrl } } });
}

// DELETE /api/posts/:id — author or admin.
//
// Preserve, never delete, while a report is open — no exception for
// admins. Moderation gap 3 (2026-09-08, see DECISIONS.md) originally
// blocked only the author path, on the reasoning that the correct admin
// action on a reported post is `preserve` via /admin/reports (PATCH
// /api/admin/reports/:id), not this route — but this route didn't
// enforce that choice, so an admin (or an author who happens to be one)
// hitting DELETE directly could still hard-delete a post — and cascade
// away every comment/like on it — out from under an open report,
// leaving that Report stuck at status "open" and pointing at nothing.
// Closed 2026-09-16 (see DECISIONS.md): the open-report check now runs
// for every caller, admins included, and also covers a report filed
// against any of the post's own comments — deleting the post would
// cascade those away too, taking that evidence with it just as
// surely as deleting the post itself would. An admin who genuinely
// needs the content gone still has the real path: soft-remove through
// /admin/reports, which never destroys the row.
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

  const commentIds = (await prisma.comment.findMany({ where: { postId: post.id }, select: { id: true } })).map(
    (c) => c.id,
  );
  const openReport = await prisma.report.findFirst({
    where: {
      status: "open",
      OR: [
        { targetType: "post", targetId: post.id },
        ...(commentIds.length > 0 ? [{ targetType: "comment" as const, targetId: { in: commentIds } }] : []),
      ],
    },
    select: { id: true },
  });
  if (openReport) {
    return NextResponse.json({ error: "This post is under review and can't be deleted right now." }, { status: 409 });
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
