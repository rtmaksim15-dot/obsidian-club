import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { getLevelProgress } from "@/lib/rating/level-progress";

const LEVEL_NAMES: Record<number, string> = {
  1: "Initiate",
  2: "Member",
  3: "Senior Member",
  4: "Mentor",
  5: "Master",
  6: "Council Member",
};

/**
 * The Hall (`/hall`) — v0.3: real status card, progress-to-next-level,
 * referral link + stats, and notifications. Rooms/events/tasks blocks
 * stay out (no real Rooms/Events system exists yet — see
 * app/(platform)/layout.tsx's placeholder pages, v0.4/v0.7).
 */
export default async function HallPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/hall");

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const ritual = getRitualStatus(user, profile);
  if (!ritual.complete) redirect("/ritual");

  const [notifications, referralCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.referral.count({ where: { inviterId: user.id, status: { in: ["joined", "active"] } } }),
  ]);

  const progress = getLevelProgress(user);
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || ""}/?ref=${user.referralCode}`;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <div className={`avatar avatar-level-${user.level} h-16 w-16`}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ob-surface text-xl">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <p className="text-body mt-4 italic">Welcome back,</p>
        <h1 className="text-h1 mt-1">{user.displayName}</h1>
        <p className="font-cinzel uppercase tracking-brand text-ob-gold mt-2 text-sm">
          {LEVEL_NAMES[user.level] ?? `Level ${user.level}`}
        </p>

        <a href={`/profile/${user.id}/edit`} className="btn-ghost mt-4 inline-block">
          Edit profile
        </a>

        {/* Status */}
        <div className="card-profile mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="text-label">Reputation</p>
            <p className="text-data mt-1">{Number(user.reputation).toFixed(1)} ★</p>
          </div>
          <div>
            <p className="text-label">Rating</p>
            <p className="text-data mt-1">{user.rating}</p>
          </div>
          <div>
            <p className="text-label">Influence</p>
            <p className="text-data mt-1">{user.influence}</p>
          </div>
          <div>
            <p className="text-label">Trust Score</p>
            <p className="text-data mt-1">{user.trustScore}</p>
          </div>
        </div>

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
      </div>
    </main>
  );
}
