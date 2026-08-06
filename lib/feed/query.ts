import "server-only";
import type { PostType, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const FEED_TYPES: PostType[] = ["post", "story"];
export const FEED_PAGE_SIZE = 20;

export const feedPostSelect = {
  id: true,
  title: true,
  content: true,
  mediaUrls: true,
  type: true,
  likesCount: true,
  createdAt: true,
  author: { select: { id: true, displayName: true, avatarUrl: true, level: true, rep: true } },
  house: { select: { id: true, name: true, slug: true } },
  _count: { select: { comments: true } },
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
  const memberships = await prisma.houseMembership.findMany({
    where: { userId: user.id },
    select: { house: { select: { id: true } } },
  });
  const joinedHouseIds = memberships.map((m) => m.house.id);

  const where = {
    isPublished: true,
    minLevel: { lte: user.level },
    type: { in: FEED_TYPES },
    OR: [{ houseId: null }, { houseId: { in: joinedHouseIds } }],
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

  return { posts, hasMore: skip + posts.length < total };
}
