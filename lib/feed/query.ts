import "server-only";
import type { PostType, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAvatarUrls, resolvePostImages } from "@/lib/storage/resolve-media";
import { getBlockedEitherWayUserIds } from "@/lib/moderation/block";
import { getTestAccountUserIds } from "@/lib/moderation/test-accounts";

export const FEED_TYPES: PostType[] = ["post", "story"];
export const FEED_PAGE_SIZE = 20;

export const feedPostSelect = {
  id: true,
  title: true,
  content: true,
  type: true,
  likesCount: true,
  createdAt: true,
  author: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true, rep: true, isTest: true } },
  house: { select: { id: true, name: true, slug: true } },
  _count: { select: { comments: true } },
  // Multi-photo posts, Phase C (2026-10-10, see DECISIONS.md).
  images: {
    where: { isDeleted: false },
    orderBy: { position: "asc" as const },
    select: { id: true, storagePath: true, position: true, width: true, height: true },
  },
} as const;

/**
 * Shared feed query — used by both the initial SSR render
 * (app/(platform)/feed/page.tsx) and the "load more" pagination
 * endpoint (app/api/feed/route.ts), so the two can never drift apart
 * (Block 5, August hardening pass, 2026-08-05: feed pagination didn't
 * exist at all before this — `take: 30` with no cursor was a hard
 * ceiling on the whole feed).
 */
export async function getFeedPosts(user: User, { skip = 0 }: { skip?: number } = {}) {
  const [memberships, blockedUserIds, testAccountIds] = await Promise.all([
    prisma.houseMembership.findMany({
      where: { userId: user.id },
      select: { house: { select: { id: true } } },
    }),
    getBlockedEitherWayUserIds(user.id),
    // Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md)
    // — a non-admin viewer never sees a test account's posts at all;
    // an admin sees everything (the query below skips this exclusion
    // for them entirely, not just re-including the ids).
    user.isAdmin ? Promise.resolve([]) : getTestAccountUserIds(),
  ]);
  const joinedHouseIds = memberships.map((m) => m.house.id);

  // Security fix (2026-09-23, see DECISIONS.md) — blocking previously
  // only worked on DMs and the profile page; the feed never checked it,
  // so a blocked member's posts still showed up for the person who
  // blocked them (and vice versa). Filtered in the `where` clause
  // itself, not after the fact, so `skip`/`take`/`total` below stay
  // correct against the already-filtered set.
  const where = {
    isPublished: true,
    minLevel: { lte: user.level },
    type: { in: FEED_TYPES },
    OR: [{ houseId: null }, { houseId: { in: joinedHouseIds } }],
    authorId: { notIn: [...blockedUserIds, ...testAccountIds] },
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: FEED_PAGE_SIZE,
      select: {
        ...feedPostSelect,
        likes: { where: { userId: user.id }, select: { userId: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  // Private storage (task 2, 2026-09-23, see DECISIONS.md) — resolved
  // here, once, for both of this function's callers (the SSR feed page
  // and the load-more API route), batched across the whole page rather
  // than one signed-URL mint per post.
  const avatarUrls = await resolveAvatarUrls(posts.map((p) => p.author.avatarUrl));
  const resolvedPosts = await Promise.all(
    posts.map(async (post, i) => ({
      ...post,
      images: await resolvePostImages(post.images),
      author: { ...post.author, avatarUrl: avatarUrls[i] },
    })),
  );

  return { posts: resolvedPosts, hasMore: skip + posts.length < total };
}
