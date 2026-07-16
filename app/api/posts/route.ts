import { NextResponse } from "next/server";
import type { PostType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreatePostType } from "@/lib/rating/content-rights";
import { grantAchievement } from "@/lib/utils/achievements";
import { awardRep, awardRepWithDailyCap, REP_TABLE } from "@/lib/rating/rep-engine";

const PAGE_SIZE = 20;
const VALID_TYPES: PostType[] = ["post", "story", "article", "lecture", "manifesto", "course"];
const EXTERNAL_LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;

const postSelect = {
  id: true,
  title: true,
  content: true,
  mediaUrls: true,
  type: true,
  minLevel: true,
  viewsCount: true,
  likesCount: true,
  createdAt: true,
  publishedAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
  _count: { select: { comments: true } },
};

// GET /api/posts — the content feed, newest-first, filtered to what the
// caller's level can see (`Post.minLevel`) — same "locked, not hidden"
// intent as Rooms doesn't apply here since PRODUCT.md doesn't document a
// public "locked post" teaser, so out-of-reach posts are simply excluded.
// Optional ?type= filters to one PostType (used by the Library view).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get("type");
  if (typeParam && !VALID_TYPES.includes(typeParam as PostType)) {
    return NextResponse.json({ error: "Invalid type filter." }, { status: 422 });
  }

  const posts = await prisma.post.findMany({
    where: {
      isPublished: true,
      minLevel: { lte: user.level },
      ...(typeParam ? { type: typeParam as PostType } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: PAGE_SIZE,
    select: postSelect,
  });

  return NextResponse.json({ posts });
}

type Body = { type?: string; title?: string; content?: string; minLevel?: number; houseId?: string };

// POST /api/posts — create + publish immediately (no draft workflow is
// documented in PRODUCT.md, so this doesn't invent one). Creation rights
// are gated by `canCreatePostType` per PRODUCT.md §10's exact table.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const type = body.type;
  if (!type || !VALID_TYPES.includes(type as PostType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 422 });
  }

  if (!canCreatePostType(user, type as PostType)) {
    return NextResponse.json(
      { error: "Your level doesn't allow creating this type of content." },
      { status: 403 },
    );
  }

  const content = body.content?.trim();
  const title = body.title?.trim();
  if (!content) {
    return NextResponse.json({ error: "Content can't be empty." }, { status: 422 });
  }
  if (content.length > 20000) {
    return NextResponse.json({ error: "Content is too long." }, { status: 422 });
  }
  // CLAUDE.md (2026-07-05): "No external links in posts (keeps content
  // inside OC ecosystem)" — a literal, specified rule, not a fabricated
  // one. Simple URL detection, not link-preview parsing.
  if (EXTERNAL_LINK_PATTERN.test(content) || (title && EXTERNAL_LINK_PATTERN.test(title))) {
    return NextResponse.json({ error: "External links aren't allowed in posts." }, { status: 422 });
  }

  const minLevel = body.minLevel ?? 1;
  if (!Number.isInteger(minLevel) || minLevel < 1 || minLevel > 6) {
    return NextResponse.json({ error: "Invalid minimum level." }, { status: 422 });
  }

  let houseId: string | null = null;
  if (body.houseId) {
    const house = await prisma.house.findUnique({ where: { id: body.houseId } });
    if (!house || house.status !== "active") {
      return NextResponse.json({ error: "Invalid house." }, { status: 422 });
    }
    houseId = house.id;
  }

  try {
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        type: type as PostType,
        title: title || null,
        content,
        minLevel,
        houseId,
        isPublished: true,
        publishedAt: new Date(),
      },
      select: postSelect,
    });

    const publishedCount = await prisma.post.count({ where: { authorId: user.id, isPublished: true } });
    if (publishedCount === 1) {
      await grantAchievement(user.id, "first-post");
      await awardRep(user.id, REP_TABLE.earn.firstPost.points, "First post", "first-post");
    }

    // REP system + Vault (2026-07-16): posting *tagged with a house*
    // earns REP too (separate from the one-time first-post bonus above),
    // capped per day so it can't be farmed by spamming one house.
    if (houseId) {
      await awardRepWithDailyCap(
        user.id,
        REP_TABLE.earn.housePost.points,
        "Posted in a House",
        "house-post",
        10,
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error("[posts] Failed to create post:", err);
    return NextResponse.json({ error: "Could not publish. Try again shortly." }, { status: 503 });
  }
}
