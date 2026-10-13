import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { getFeedPosts } from "@/lib/feed/query";
import { getVeilEnabled } from "@/lib/profile/veil";
import FeedList from "@/components/shared/FeedList";
import NewcomerPathCard from "@/components/shared/NewcomerPathCard";
import { syncNewcomerPath, allStepsComplete, filledSegments, isDismissed } from "@/lib/newcomer-path/status";

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
  //
  // The founder account is the one deliberate exception (2026-09-10,
  // production decision): Lord Obsidian doesn't pass through
  // initiation — he's already inside. Every isAdmin account skips this
  // gate entirely, same as it already skips the Doors gate below.
  if (!user.isAdmin) {
    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    const ritual = await getRitualStatus(user, profile);
    if (!ritual.complete) redirect("/ritual");
  }

  // Doors mechanic (2026-08-08) — admins and launch-preview accounts
  // (PREVIEW_USER_IDS) always bypass; everyone else sees the
  // antechamber instead of real content while doors.active.
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  const [{ posts, hasMore }, veilEnabled] = await Promise.all([getFeedPosts(user), getVeilEnabled(user.id)]);

  // Newcomer Path (Package 5, Phase A, 2026-10-14, see DECISIONS.md) —
  // admins skip this entirely, same exception as the ritual/Doors gates
  // above: an admin never actually completes the ritual (isAdmin bypasses
  // it outright), so "crossed the threshold" never applies to begin with.
  const newcomerPath = user.isAdmin ? null : await syncNewcomerPath(user.id);
  const newcomerPathDone = newcomerPath ? allStepsComplete(newcomerPath.completion) : true;

  return (
    <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
      <div className="mx-auto max-w-2xl">
        {newcomerPath && (!newcomerPathDone || newcomerPath.justCompleted) ? (
          <NewcomerPathCard
            completion={newcomerPath.completion}
            filled={filledSegments(newcomerPath.completion)}
            initiallyDismissed={isDismissed(newcomerPath.settings)}
            justCompleted={newcomerPath.justCompleted}
          />
        ) : null}
        <FeedList
          initialPosts={posts}
          initialHasMore={hasMore}
          viewerId={user.id}
          viewerIsAdmin={user.isAdmin}
          viewerVeilEnabled={veilEnabled}
        />
      </div>
    </main>
  );
}
