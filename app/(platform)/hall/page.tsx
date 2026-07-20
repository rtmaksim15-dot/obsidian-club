import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { getLevelProgress } from "@/lib/rating/level-progress";
import { syncReferralLifecycle } from "@/lib/rating/referral-lifecycle";
import { checkLevelUp } from "@/lib/rating/level-progression";
import { LEVEL_NAMES } from "@/lib/rating/levels";

/**
 * The Hall (`/hall`) — status card, progress-to-next-level, referral
 * link + stats, notifications, and (v0.5) recent rating history.
 * Rooms/events/tasks blocks stay out where those features don't exist
 * yet (Events is v0.7) — see app/(platform)/layout.tsx's placeholders.
 */
export default async function HallPage() {
  let user = await getCurrentUser();
  if (!user) redirect("/login?next=/hall");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const ritual = await getRitualStatus(user, profile);
  if (!ritual.complete) redirect("/ritual");

  // No real cron yet (see TECH_DEBT.md) — check referral lifecycle
  // transitions and level-up eligibility opportunistically whenever a
  // member loads their own Hall.
  await syncReferralLifecycle(user.id);
  await checkLevelUp(user.id);
  user = (await prisma.user.findUnique({ where: { id: user.id } }))!;

  const [notifications, referralCount, repHistory, publishedContentCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.referral.count({ where: { inviterId: user.id, status: { in: ["joined", "active"] } } }),
    prisma.repHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.post.count({ where: { authorId: user.id, isPublished: true } }),
  ]);

  const progress = getLevelProgress(user, { hasPublishedContent: publishedContentCount >= 1 });
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || ""}/?ref=${user.referralCode}`;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <a href={`/profile/${user.username}`} className={`avatar avatar-level-${user.level} h-16 w-16 block`}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ob-surface text-xl">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </a>

        <p className="text-body mt-4 italic">Welcome back,</p>
        <a href={`/profile/${user.username}`}>
          <h1 className="text-h1 mt-1">{user.displayName}</h1>
        </a>
        <p className="font-cinzel uppercase tracking-brand text-ob-gold mt-2 text-sm">
          {LEVEL_NAMES[user.level] ?? `Level ${user.level}`}
        </p>

        <a href="/profile/edit" className="btn-ghost mt-4 inline-block">
          Edit profile
        </a>

        {/* Status */}
        <div className="card-profile mt-10 grid grid-cols-3 gap-6">
          <div>
            <p className="text-label">Reputation</p>
            <p className="text-data mt-1">{Number(user.reputation).toFixed(1)} ★</p>
          </div>
          <div>
            <p className="text-label">REP</p>
            <p className="text-data mt-1">{user.rep}</p>
          </div>
          <div>
            <p className="text-label">Trust Score</p>
            <p className="text-data mt-1">{user.trustScore}</p>
          </div>
        </div>
        {user.currentStreak > 0 ? (
          <p className="text-caption mt-3" style={{ color: "var(--color-text-secondary)" }}>
            {user.currentStreak}-day login streak (best: {user.longestStreak})
          </p>
        ) : null}

        {/* Progress */}
        <section className="mt-10">
          <p className="text-label mb-3">Your Next Level</p>
          {progress.isManualAppointment ? (
            <p className="text-body">
              {progress.nextLevelName
                ? `${progress.nextLevelName} is appointed, not earned through a checklist.`
                : "You've reached the highest documented level."}
            </p>
          ) : (
            <div className="card">
              <p className="text-body mb-3">Toward {progress.nextLevelName}:</p>
              <ul className="space-y-2">
                {progress.criteria.map((c) => (
                  <li key={c.label} className="text-caption flex items-center gap-2">
                    <span
                      style={{
                        color:
                          c.met === true
                            ? "var(--color-success)"
                            : c.met === false
                              ? "var(--color-text-muted)"
                              : "var(--color-text-secondary)",
                      }}
                    >
                      {c.met === true ? "✓" : c.met === false ? "○" : "—"}
                    </span>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {c.label}
                      {c.met === null ? " (not yet tracked)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Referrals */}
        <section className="mt-10">
          <p className="text-label mb-3">Your Invitation</p>
          <div className="card">
            <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
              Your personal link
            </p>
            <p className="text-data mt-1 break-all">{referralLink}</p>
            <p className="text-caption mt-3">
              {referralCount} joined via your invitation.
            </p>
          </div>
        </section>

        {/* Notifications */}
        <section className="mt-10">
          <p className="text-label mb-3">Notifications</p>
          {notifications.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              Nothing yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="card">
                  <p className="text-h2 !text-sm">{n.title}</p>
                  {n.body ? <p className="text-caption mt-1">{n.body}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* REP history */}
        <section className="mt-10">
          <p className="text-label mb-3">Recent REP Changes</p>
          {repHistory.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No changes yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {repHistory.map((h) => (
                <li key={h.id} className="text-caption flex items-center justify-between">
                  <span style={{ color: "var(--color-text-secondary)" }}>{h.reason}</span>
                  <span style={{ color: h.delta >= 0 ? "var(--color-success)" : "var(--color-error)" }}>
                    {h.delta >= 0 ? `+${h.delta}` : h.delta}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
