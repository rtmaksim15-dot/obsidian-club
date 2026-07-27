import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessRoom } from "@/lib/rating/room-access";
import { HOUSES_UI_ENABLED } from "@/lib/config/feature-flags";

const GROUP_LABELS: Record<string, string> = {
  general: "General",
  newcomers: "Newcomers",
  local: "Local Circles",
  thematic: "Thematic",
  mentors: "Wardens",
  masters: "Masters",
  council: "Council",
  level: "By Level",
};
const GROUP_ORDER = ["general", "newcomers", "thematic", "local", "mentors", "masters", "council", "level"];

/**
 * Rooms (`/rooms`), v0.4 — real data, replacing the "coming soon"
 * placeholder. Locked rooms are shown, not hidden, per DESIGN.md.
 */
export default async function RoomsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/rooms");

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const grouped = GROUP_ORDER.map((type) => ({
    type,
    label: GROUP_LABELS[type] ?? type,
    rooms: rooms.filter((r) => r.type === type),
  })).filter((g) => g.rooms.length > 0);

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-4">Rooms</h1>
        {/* CLAUDE.md's (2026-07-05) Community tab folds events, groups,
            and people-discovery in as filters — only Events exists today
            (as a placeholder), linked here rather than its own nav tab.
            See ADR-0015 and TECH_DEBT.md. */}
        <div className="mb-10 flex gap-5">
          <a href="/events" className="text-caption inline-block text-ob-accent">
            Events →
          </a>
          {HOUSES_UI_ENABLED ? (
            <a href="/houses" className="text-caption inline-block text-ob-accent">
              Houses →
            </a>
          ) : null}
        </div>

        {grouped.length === 0 ? (
          <p className="text-body">No rooms yet.</p>
        ) : (
          <div className="space-y-10">
            {grouped.map((group) => (
              <section key={group.type}>
                <p className="text-label mb-3">{group.label}</p>
                <ul className="space-y-3">
                  {group.rooms.map((room) => {
                    const locked = !canAccessRoom(user, room);
                    return (
                      <li key={room.id}>
                        {locked ? (
                          <div className="card flex items-center justify-between opacity-60">
                            <div>
                              <p className="text-h2 !text-base">{room.name}</p>
                              {room.description ? (
                                <p className="text-caption mt-1">{room.description}</p>
                              ) : null}
                            </div>
                            <Lock size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
                          </div>
                        ) : (
                          <a href={`/rooms/${room.slug}`} className="card group block">
                            <p className="text-h2 !text-base transition-colors group-hover:text-ob-accent">
                              {room.name}
                            </p>
                            {room.description ? (
                              <p className="text-caption mt-1">{room.description}</p>
                            ) : null}
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
