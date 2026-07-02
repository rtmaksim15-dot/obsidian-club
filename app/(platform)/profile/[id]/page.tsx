import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

const LEVEL_NAMES: Record<number, string> = {
  1: "Initiate",
  2: "Member",
  3: "Senior Member",
  4: "Mentor",
  5: "Master",
  6: "Council Member",
};

/**
 * Basic member profile — v0.2 skeleton. PRODUCT.md's full spec (tabs for
 * stats/achievements/content/reviews) is BACKLOG.md's v0.3 scope; this is
 * just the header info against real data.
 */
export default async function ProfilePage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) notFound();

  const stars = Math.round(Number(user.reputation));

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <div className={`avatar avatar-level-${user.level} h-24 w-24`}>
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ob-surface text-2xl">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <h1 className="text-h1 mt-6">{user.displayName}</h1>
        <p className="font-cinzel uppercase tracking-brand text-ob-gold mt-1 text-sm">
          {LEVEL_NAMES[user.level] ?? `Level ${user.level}`}
        </p>

        <p className="mt-3" aria-label={`${stars} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < stars ? "star-filled" : "star-empty"}>
              ★
            </span>
          ))}
        </p>

        <p className="text-caption mt-4" style={{ color: "var(--color-text-secondary)" }}>
          {[user.locationCity, user.locationCountry].filter(Boolean).join(", ") || "Location not shared"}
          {user.joinedAt ? ` · Member since ${user.joinedAt.toLocaleDateString()}` : ""}
        </p>

        {user.bio ? <p className="text-body mt-6">{user.bio}</p> : null}
      </div>
    </main>
  );
}
