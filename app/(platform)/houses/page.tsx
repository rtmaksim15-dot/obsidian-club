import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Houses (`/houses`) — CLAUDE.md's (restored version, 2026-07-08)
 * "Houses System": thematic verticals within the club, each with its
 * own room and content. Phase 1 is House of Rope, seeded in
 * prisma/seed.ts; "coming soon" houses are shown, not hidden, same
 * "locked, not hidden" intent as Rooms.
 */
export default async function HousesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/houses");

  const houses = await prisma.house.findMany({ orderBy: { name: "asc" } });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-10">Houses</h1>

        {houses.length === 0 ? (
          <p className="text-body">No houses yet.</p>
        ) : (
          <ul className="space-y-3">
            {houses.map((house) => {
              const comingSoon = house.status === "coming_soon";
              return (
                <li key={house.id}>
                  {comingSoon ? (
                    <div className="card opacity-60">
                      <p className="text-h2 !text-base">{house.name}</p>
                      {house.tagline ? <p className="text-caption mt-1">{house.tagline}</p> : null}
                      <p className="text-caption mt-2" style={{ color: "var(--color-text-muted)" }}>
                        Coming soon
                      </p>
                    </div>
                  ) : (
                    <a href={`/houses/${house.slug}`} className="card group block">
                      <p className="text-h2 !text-base transition-colors group-hover:text-ob-accent">
                        {house.name}
                      </p>
                      {house.tagline ? <p className="text-caption mt-1">{house.tagline}</p> : null}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
