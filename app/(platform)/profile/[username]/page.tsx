import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import ReviewForm from "@/components/shared/ReviewForm";
import PostCard, { type FeedPost } from "@/components/shared/PostCard";
import { LEVEL_NAMES } from "@/lib/rating/levels";
import { REP_UI_ENABLED, HOUSES_UI_ENABLED, LEVELS_UI_ENABLED } from "@/lib/config/feature-flags";

/**
 * Member profile — looked up by `username` (User Profiles task,
 * 2026-07-17), replacing the old id-based `/profile/[id]`. Real header
 * data, house memberships, last 5 posts, reviews, and (owner-only) a
 * REP event ledger. Still no full tab system (PRODUCT.md's
 * stats/achievements/content/reviews tabs) — everything renders as flat
 * sections, same pattern as before.
 */
export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await prisma.user.findUnique({ where: { username: params.username } });
  if (!user) notFound();

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === user.id;

  const [reviews, repHistory, memberships, posts] = await Promise.all([
    prisma.review.findMany({
      where: { reviewedId: user.id, isVisible: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reviewer: { select: { id: true, displayName: true } } },
    }),
    // REP's own ledger is more personal than the aggregate score (which
    // is public, above) — shown only to the profile's owner, same
    // reasoning as the review form only showing for other people's
    // profiles, just inverted.
    isOwnProfile && REP_UI_ENABLED
      ? prisma.repHistory.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    HOUSES_UI_ENABLED
      ? prisma.houseMembership.findMany({
          where: { userId: user.id },
          orderBy: { joinedAt: "asc" },
          include: { house: { select: { name: true, slug: true } } },
        })
      : Promise.resolve([]),
    prisma.post.findMany({
      where: { authorId: user.id, isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        mediaUrls: true,
        type: true,
        likesCount: true,
        createdAt: true,
        author: { select: { id: true, displayName: true, avatarUrl: true, level: true, rep: true } },
        house: { select: { id: true, name: true, slug: true } },
        likes: { where: { userId: viewer?.id ?? "" }, select: { userId: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  const stars = Math.round(Number(user.reputation));
  const memberSince = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString("en-US", { timeZone: "UTC" })
    : null;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <div className={`avatar h-24 w-24 ${LEVELS_UI_ENABLED ? `avatar-level-${user.level}` : ""}`}>
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
        <p className="text-data" style={{ color: "var(--color-text-secondary)" }}>
          @{user.username}
        </p>
        {LEVELS_UI_ENABLED ? (
          <p className="font-cinzel uppercase tracking-brand text-ob-gold mt-1 text-sm">
            {LEVEL_NAMES[user.level] ?? `Level ${user.level}`}
          </p>
        ) : null}

        {REP_UI_ENABLED ? (
          <div className="mt-3 flex items-center gap-4">
            <p aria-label={`${stars} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < stars ? "star-filled" : "star-empty"}>
                  ★
                </span>
              ))}
            </p>
            <p className="text-data" style={{ color: "var(--color-text-secondary)" }}>
              {user.rep} REP
            </p>
          </div>
        ) : null}

        <p className="text-caption mt-4" style={{ color: "var(--color-text-secondary)" }}>
          {[user.locationCity, user.locationCountry].filter(Boolean).join(", ") || "Location not shared"}
          {memberSince ? ` · Member since ${memberSince}` : ""}
        </p>

        {user.bio ? <p className="text-body mt-6">{user.bio}</p> : null}

        {isOwnProfile ? (
          <a href="/profile/edit" className="btn-ghost mt-6 inline-block">
            Edit profile
          </a>
        ) : null}

        {memberships.length > 0 ? (
          <section className="mt-10">
            <p className="text-label mb-3">Houses</p>
            <ul className="flex flex-wrap gap-2">
              {memberships.map((m) => (
                <li key={m.id}>
                  <a
                    href={`/houses/${m.house.slug}`}
                    className="text-caption inline-block rounded-ob border px-3 py-1.5 uppercase tracking-brand"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    {m.house.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {viewer && !isOwnProfile ? (
          <section className="mt-10">
            <p className="text-label mb-3">Leave a Review</p>
            <ReviewForm reviewedId={user.id} />
          </section>
        ) : null}

        {isOwnProfile && REP_UI_ENABLED ? (
          <section className="mt-10">
            <p className="text-label mb-3">REP History</p>
            {repHistory.length === 0 ? (
              <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
                No REP events yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {repHistory.map((h) => (
                  <li key={h.id} className="card flex items-center justify-between gap-4 !py-3">
                    <div>
                      <p className="text-data !text-sm">{h.reason ?? h.source ?? "REP event"}</p>
                      <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(h.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                      </p>
                    </div>
                    <p
                      className="text-data shrink-0"
                      style={{ color: h.delta >= 0 ? "var(--color-success)" : "var(--color-error)" }}
                    >
                      {h.delta >= 0 ? `+${h.delta}` : h.delta}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        <section className="mt-10">
          <p className="text-label mb-3">Reviews</p>
          {reviews.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No reviews yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="text-data">{r.reviewer.displayName}</p>
                    <p aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={i < r.rating ? "star-filled" : "star-empty"}>
                          ★
                        </span>
                      ))}
                    </p>
                  </div>
                  {r.comment ? <p className="text-body mt-2 !text-base">{r.comment}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <p className="text-label mb-3">Recent Posts</p>
          {posts.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No posts yet.
            </p>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post as FeedPost} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
