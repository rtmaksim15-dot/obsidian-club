import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getRitualStatus } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { resolveAvatarUrls } from "@/lib/storage/resolve-media";

/**
 * Members (`/members`) — OBSIDIAN_ROADMAP_v3.1 "Members and Follows."
 * A small closed club doesn't need a search bar yet — a plain directory
 * sorted by join date (founders first) is the whole feature for now.
 * Once there are more than ~30 members, a filter/search input goes at
 * the top of this same page; not built yet, since it isn't needed yet.
 */
export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/members");

  // Founder exception (2026-09-10, production decision): isAdmin
  // accounts skip the Initiation Ritual gate entirely — see feed/page.tsx.
  if (!user.isAdmin) {
    const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    const ritual = await getRitualStatus(user, profile);
    if (!ritual.complete) redirect("/ritual");
  }

  // Doors mechanic (2026-08-08) — admins and launch-preview accounts
  // (PREVIEW_USER_IDS) always bypass; everyone else sees the
  // antechamber instead of real content while doors.active.
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  const rawMembers = await prisma.user.findMany({
    where: { status: "active" },
    orderBy: { joinedAt: "asc" },
    select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true },
  });

  // Private storage (task 2, 2026-09-23, see DECISIONS.md).
  const avatarUrls = await resolveAvatarUrls(rawMembers.map((m) => m.avatarUrl));
  const members = rawMembers.map((m, i) => ({ ...m, avatarUrl: avatarUrls[i] }));

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-6">Members</h1>

        <div>
          {members.map((m) => {
            const rowContent = (
              <>
                <div className="avatar h-11 w-11 shrink-0">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.avatarUrl} alt={m.displayName} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-data">{m.displayName}</p>
                  {m.bio ? (
                    <p className="text-caption truncate" style={{ color: "var(--color-text-muted)" }}>
                      {m.bio}
                    </p>
                  ) : null}
                </div>
              </>
            );
            const rowClassName = "flex items-center gap-3 py-3";
            const rowStyle = { borderBottom: "1px solid var(--color-border-subtle)" };
            // Nullable username (2026-09-25, see DECISIONS.md) — an
            // ordinary member can't appear here without one (this
            // directory is ritual-gated), so this only fires for an
            // admin account without a username. No profile to link to,
            // so the row renders unlinked instead of a link to a
            // broken/empty URL.
            return m.username ? (
              <a key={m.id} href={`/profile/${m.username}`} className={rowClassName} style={rowStyle}>
                {rowContent}
              </a>
            ) : (
              <div key={m.id} className={rowClassName} style={rowStyle}>
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
