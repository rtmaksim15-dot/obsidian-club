import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import ReviewForm from "@/components/shared/ReviewForm";
import { LEVEL_NAMES } from "@/lib/rating/levels";

/**
 * Member profile — real header data plus (v0.5) real reviews. Still no
 * full tab system (PRODUCT.md's stats/achievements/content/reviews tabs)
 * — reviews render as a flat section, same pattern as the rest of the
 * profile so far.
 */
export default async function ProfilePage({ params }: { params: { id: string } }) {
  const [user, viewer, reviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.id } }),
    getCurrentUser(),
    prisma.review.findMany({
      where: { reviewedId: params.id, isVisible: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { reviewer: { select: { id: true, displayName: true } } },
    }),
  ]);
  if (!user) notFound();

  const stars = Math.round(Number(user.reputation));
  const isOwnProfile = viewer?.id === user.id;

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

        {viewer && !isOwnProfile ? (
          <section className="mt-10">
            <p className="text-label mb-3">Leave a Review</p>
            <ReviewForm reviewedId={user.id} />
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
      </div>
    </main>
  );
}
