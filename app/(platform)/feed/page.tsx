import { redirect } from "next/navigation";
import type { PostType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { canCreatePostType } from "@/lib/rating/content-rights";
import ContentComposer from "@/components/shared/ContentComposer";
import PostList from "@/components/shared/PostList";
import { HOUSES_UI_ENABLED } from "@/lib/config/feature-flags";

const FEED_TYPES: PostType[] = ["post", "story"];

/**
 * Feed (`/feed`) — CLAUDE.md's (2026-07-05) nav tab 1: "community posts,
 * activity, stories." Split out of the old `/content` page (which mixed
 * feed + library) as part of the navigation restructure — see ADR-0015.
 * Not yet algorithmic (no "For You"/"Following" split, no ranking) — a
 * plain reverse-chronological list. See TECH_DEBT.md.
 *
 * Scope (Feed & Posts MVP, 2026-07-16): global posts (no house) + posts
 * from houses the caller has actually joined (`HouseMembership`) — not
 * every active house, now that membership is a real thing. The composer's
 * house dropdown is scoped the same way: you can only tag a post to a
 * house you've joined (enforced again server-side in `POST /api/posts`).
 */
export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/feed");

  // /feed is now the default post-login landing spot (see /login,
  // /auth/callback), so it needs the same Initiation Ritual gate /hall
  // already enforces — otherwise a member who hasn't accepted the Code
  // of Conduct/read the introduction/posted in Newcomers could land
  // straight on the real feed and skip the ritual entirely.
  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const ritual = await getRitualStatus(user, profile);
  if (!ritual.complete) redirect("/ritual");

  const memberships = await prisma.houseMembership.findMany({
    where: { userId: user.id },
    select: { house: { select: { id: true, name: true } } },
  });
  const joinedHouseIds = memberships.map((m) => m.house.id);

  const posts = await prisma.post.findMany({
    where: {
      isPublished: true,
      minLevel: { lte: user.level },
      type: { in: FEED_TYPES },
      OR: [{ houseId: null }, { houseId: { in: joinedHouseIds } }],
    },
    orderBy: { publishedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      content: true,
      mediaUrls: true,
      type: true,
      likesCount: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true, level: true, rep: true } },
      house: { select: { id: true, name: true, slug: true } },
      likes: { where: { userId: user.id }, select: { userId: true } },
      _count: { select: { comments: true } },
    },
  });

  const allowedTypes = FEED_TYPES.filter((t) => canCreatePostType(user, t));
  // Feed-first v1 — the composer's house dropdown is part of the
  // "browse/tag houses" UI the roadmap defers, even though the
  // underlying membership scoping above (which posts show in feed)
  // keeps working untouched.
  const houses = HOUSES_UI_ENABLED ? memberships.map((m) => m.house) : [];

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-6">Feed</h1>

        <ContentComposer allowedTypes={allowedTypes} houses={houses} />

        <PostList posts={posts} />
      </div>
    </main>
  );
}
