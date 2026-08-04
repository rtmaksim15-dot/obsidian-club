import { NextResponse } from "next/server";
import type { PostType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { canCreatePostType } from "@/lib/rating/content-rights";
import { grantAchievement } from "@/lib/utils/achievements";
import { awardRep, awardRepWithDailyCap, REP_TABLE } from "@/lib/rating/rep-engine";
import { track } from "@/lib/analytics/track";
import { isValidImageSignature } from "@/lib/utils/validateImageBytes";
import { createAdminClient } from "@/lib/auth/supabase-admin";

const PAGE_SIZE = 20;
const VALID_TYPES: PostType[] = ["post", "story", "article", "lecture", "manifesto", "course"];
const EXTERNAL_LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;

// `likes` is scoped to the caller (0 or 1 rows — "did I like this?"),
// never every like on the post — same shape `/feed`, `/library`, and
// `/posts/[id]` all already query directly via Prisma.
const postSelect = (viewerId: string) => ({
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
  author: { select: { id: true, displayName: true, avatarUrl: true, level: true, rep: true } },
  house: { select: { id: true, name: true, slug: true } },
  likes: { where: { userId: viewerId }, select: { userId: true } },
  _count: { select: { comments: true } },
});

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
    select: postSelect(user.id),
  });

  return NextResponse.json({ posts });
}

type Body = {
  type?: string;
  title?: string;
  content?: string;
  minLevel?: number;
  houseId?: string;
  photoUrl?: string;
};

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

  // Feed & Posts MVP (2026-07-16): tagging a post to a house now requires
  // real membership (`HouseMembership`, see REP-system task/DECISIONS.md)
  // — previously any active house could be tagged regardless of
  // membership, back when membership wasn't a concept yet.
  let houseId: string | null = null;
  if (body.houseId) {
    const membership = await prisma.houseMembership.findUnique({
      where: { userId_houseId: { userId: user.id, houseId: body.houseId } },
      include: { house: true },
    });
    if (!membership || membership.house.status !== "active") {
      return NextResponse.json({ error: "You can only post to houses you've joined." }, { status: 422 });
    }
    houseId = membership.houseId;
  }

  const photoUrl = body.photoUrl?.trim();
  if (photoUrl) {
    // Block 2 (August hardening pass, 2026-08-04): must be our own
    // post-photos bucket, not an arbitrary https URL a client could
    // otherwise smuggle in here (e.g. a third-party tracking pixel).
    const bucketPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-photos/`;
    if (!photoUrl.startsWith(bucketPrefix)) {
      return NextResponse.json({ error: "Invalid photo." }, { status: 422 });
    }

    // app/api/posts/photo/route.ts hands the browser a signed upload
    // URL and never sees the file's actual bytes (deliberately, to stay
    // under Vercel's request-body cap — see that route's comment), so
    // the declared Content-Type at upload time is unverified client
    // input just like `file.type` elsewhere. Verify the real bytes here
    // instead, the first point where the server can reach the uploaded
    // object directly: a short ranged read is enough to check the
    // signature without downloading the whole image.
    try {
      const check = await fetch(photoUrl, { headers: { Range: "bytes=0-15" } });
      const bytes = new Uint8Array(await check.arrayBuffer());
      if (!check.ok || !isValidImageSignature(bytes)) {
        const path = photoUrl.slice(bucketPrefix.length);
        await createAdminClient().storage.from("post-photos").remove([path]).catch(() => {});
        return NextResponse.json({ error: "This photo doesn't look like a valid image." }, { status: 422 });
      }
    } catch (err) {
      console.error("[posts] Failed to verify photo bytes:", err);
      return NextResponse.json({ error: "Could not verify the photo. Try again shortly." }, { status: 503 });
    }
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
        mediaUrls: photoUrl ? [photoUrl] : [],
        isPublished: true,
        publishedAt: new Date(),
      },
      select: postSelect(user.id),
    });

    await track({ userId: user.id, type: "post.created", entity: "post", entityId: post.id });

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
