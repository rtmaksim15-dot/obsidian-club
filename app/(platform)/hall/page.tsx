import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import AvatarUploadButton from "@/components/shared/AvatarUploadButton";

const LEVEL_NAMES: Record<number, string> = {
  1: "Initiate",
  2: "Member",
  3: "Senior Member",
  4: "Mentor",
  5: "Master",
  6: "Council Member",
};

/**
 * The Hall (`/hall`) — intentionally minimal for v0.2. Real user data,
 * but only the status card; progress-to-next-level, notifications,
 * events, and tasks blocks are BACKLOG.md's v0.3 scope (see docs/UX.md
 * "Главный Зал"), not built here.
 */
export default async function HallPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/hall");
  }

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

        <div className="mt-4">
          <AvatarUploadButton />
        </div>

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

        <p className="text-caption mt-8" style={{ color: "var(--color-text-secondary)" }}>
          Progress, notifications, events, and tasks arrive in a later
          version of the Hall.
        </p>
      </div>
    </main>
  );
}
