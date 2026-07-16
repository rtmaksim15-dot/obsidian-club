import { redirect, notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessRoom } from "@/lib/rating/room-access";
import PostList from "@/components/shared/PostList";
import JoinHouseButton from "@/components/shared/JoinHouseButton";

/**
 * House detail (`/houses/[slug]`) — the house's own room (community) and
 * tagged content (library), touching Rooms + Content per CLAUDE.md's
 * "Ecosystem Rule." Content is real but will be honestly empty until
 * something actually gets tagged with this house's id — see
 * TECH_DEBT.md (no composer UI to tag a house yet).
 *
 * Real membership (2026-07-16, REP system + Vault task): joining is
 * optional and doesn't gate the room/content below (that's still level
 * -based via `canAccessRoom`) — it's a distinct, rewarded ("+10 REP,
 * once) affirmative action, not a prerequisite for participating.
 */
export default async function HouseDetailPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/houses/${params.slug}`);

  const house = await prisma.house.findUnique({ where: { slug: params.slug } });
  if (!house || house.status !== "active") notFound();

  const [room, posts, membership, memberCount] = await Promise.all([
    prisma.room.findFirst({ where: { houseId: house.id } }),
    prisma.post.findMany({
      where: { houseId: house.id, isPublished: true, minLevel: { lte: user.level } },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        likesCount: true,
        author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
        likes: { where: { userId: user.id }, select: { userId: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.houseMembership.findUnique({ where: { userId_houseId: { userId: user.id, houseId: house.id } } }),
    prisma.houseMembership.count({ where: { houseId: house.id } }),
  ]);

  const roomLocked = room ? !canAccessRoom(user, room) : false;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">House</p>
        <h1 className="text-h1 mb-2">{house.name}</h1>
        {house.tagline ? <p className="text-body italic">{house.tagline}</p> : null}
        {house.description ? <p className="text-body mt-4">{house.description}</p> : null}

        <div className="mt-6 flex items-center gap-4">
          {membership ? (
            <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
              Member since {membership.joinedAt.toLocaleDateString()}
            </p>
          ) : (
            <JoinHouseButton slug={house.slug} />
          )}
          <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>
        </div>

        {room ? (
          <section className="mt-10">
            <p className="text-label mb-3">Room</p>
            {roomLocked ? (
              <div className="card flex items-center justify-between opacity-60">
                <p className="text-h2 !text-base">{room.name}</p>
                <Lock size={16} strokeWidth={1.5} style={{ color: "var(--color-text-muted)" }} />
              </div>
            ) : (
              <a href={`/rooms/${room.slug}`} className="card group block">
                <p className="text-h2 !text-base transition-colors group-hover:text-ob-accent">
                  Enter the room →
                </p>
              </a>
            )}
          </section>
        ) : null}

        <section className="mt-10">
          <p className="text-label mb-3">Content</p>
          <PostList posts={posts} />
        </section>
      </div>
    </main>
  );
}
