import { redirect } from "next/navigation";
import type { PostType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canCreatePostType } from "@/lib/rating/content-rights";
import ContentComposer from "@/components/shared/ContentComposer";
import PostList from "@/components/shared/PostList";

const FEED_TYPES: PostType[] = ["post", "story"];

/**
 * Feed (`/feed`) — CLAUDE.md's (2026-07-05) nav tab 1: "community posts,
 * activity, stories." Split out of the old `/content` page (which mixed
 * feed + library) as part of the navigation restructure — see ADR-0015.
 * Not yet algorithmic (no "For You"/"Following" split, no ranking) — a
 * plain reverse-chronological list. See TECH_DEBT.md.
 */
export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/feed");

  const posts = await prisma.post.findMany({
    where: { isPublished: true, minLevel: { lte: user.level }, type: { in: FEED_TYPES } },
    orderBy: { publishedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      likesCount: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
      likes: { where: { userId: user.id }, select: { userId: true } },
      _count: { select: { comments: true } },
    },
  });

  const allowedTypes = FEED_TYPES.filter((t) => canCreatePostType(user, t));

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-6">Feed</h1>

        <ContentComposer allowedTypes={allowedTypes} />

        <PostList posts={posts} />
      </div>
    </main>
  );
}
