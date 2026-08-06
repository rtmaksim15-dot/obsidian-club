import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { getFeedPosts, FEED_PAGE_SIZE } from "@/lib/feed/query";
import FeedList from "@/components/shared/FeedList";

/**
 * Feed (`/feed`) — CLAUDE.md's (2026-07-05) nav tab 1: "community posts,
 * activity, stories." Split out of the old `/content` page (which mixed
 * feed + library) as part of the navigation restructure — see ADR-0015.
 * Not yet algorithmic (no "For You"/"Following" split, no ranking) — a
 * plain reverse-chronological list. See TECH_DEBT.md.
 *
 * Scope (Feed & Posts MVP, 2026-07-16): global posts (no house) + posts
 * from houses the caller has actually joined (`HouseMembership`) — not
 * every active house, now that membership is a real thing.
 *
 * Pure content as of the 2026-07-29 nav redesign — no heading, no
 * composer (moved to its own screen, `/compose`, reached from the
 * bottom nav's center "+" tab). Posts start at the top of the page.
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

  const { posts, hasMore } = await getFeedPosts(user);

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <FeedList initialPosts={posts} initialHasMore={hasMore} pageSize={FEED_PAGE_SIZE} />
      </div>
    </main>
  );
}
