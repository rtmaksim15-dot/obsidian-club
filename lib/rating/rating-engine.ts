import { prisma } from "@/lib/db/prisma";

/**
 * Rating engine — implements ARCHITECTURE.md §5's exact component weights.
 * Each component function returns a value already scaled to its max
 * weight (not a 0-1 multiplier), so the total is a straight sum, 0-100.
 *
 * Only `reputation` has a fully specified formula in the source docs
 * ("звёзды × 6"). The others name what counts (messages/posts/views for
 * activity, achievement bonuses, referral quality, events, content) but
 * not the exact curve — the curves below are this session's documented,
 * reasonable defaults, not scripture. Revisit if real usage shows they
 * reward/punish the wrong things.
 */
const WEIGHTS = {
  reputation: 30,
  activity: 20,
  achievements: 15,
  referralQuality: 20,
  events: 10, // always 0 today — no real Events feature yet (v0.7)
  content: 5, // always 0 today — no real content-creation feature yet (v0.6)
} as const;

async function reputationComponent(userId: string, reputation: number): Promise<number> {
  // "репутация (звёзды × 6)" — reputation is 0-5, so this maxes out
  // exactly at the 30-point weight.
  return Math.min(WEIGHTS.reputation, reputation * 6);
}

async function activityComponent(userId: string): Promise<number> {
  const [messageCount, postCount] = await Promise.all([
    prisma.message.count({ where: { userId, isDeleted: false } }),
    prisma.post.count({ where: { authorId: userId, isPublished: true } }),
  ]);
  // Messages are high-frequency/low-effort, posts are the opposite —
  // weighted accordingly. Capped at the 20-point weight.
  return Math.min(WEIGHTS.activity, messageCount * 0.2 + postCount * 1);
}

async function achievementsComponent(userId: string): Promise<number> {
  const earned = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: { select: { ratingBonus: true } } },
  });
  const total = earned.reduce((sum, ua) => sum + ua.achievement.ratingBonus, 0);
  return Math.min(WEIGHTS.achievements, total);
}

async function referralQualityComponent(userId: string): Promise<number> {
  const referrals = await prisma.referral.findMany({
    where: { inviterId: userId },
    select: { impactScore: true },
  });
  const total = referrals.reduce((sum, r) => sum + r.impactScore, 0);
  return Math.min(WEIGHTS.referralQuality, Math.max(0, total));
}

async function contentComponent(userId: string): Promise<number> {
  // Curated content only (article/lecture/course/manifesto), not plain
  // posts/stories — those already feed `activityComponent`'s post count.
  // Keeping the two disjoint avoids double-counting the same post under
  // both buckets. 2 points per curated piece, capped at the 5-point
  // weight, is this session's documented default (ARCHITECTURE.md §5
  // names the "content" bucket but not its curve) — not literal spec.
  const count = await prisma.post.count({
    where: {
      authorId: userId,
      isPublished: true,
      type: { in: ["article", "lecture", "course", "manifesto"] },
    },
  });
  return Math.min(WEIGHTS.content, count * 2);
}

/** Recomputes and persists a member's rating, logging the delta to
 *  RatingHistory (PRODUCT.md's "История изменений рейтинга"). Call this
 *  after anything that could move the score: a new review, an
 *  achievement grant, a referral status change. */
export async function recalculateRating(userId: string, reason: string, source: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const [activity, achievements, referralQuality, content] = await Promise.all([
    activityComponent(userId),
    achievementsComponent(userId),
    referralQualityComponent(userId),
    contentComponent(userId),
  ]);
  const reputation = await reputationComponent(userId, Number(user.reputation));

  // events still contributes 0 — no real Events feature exists yet
  // (v0.7) to measure it from. content is real as of v0.6 (see
  // contentComponent above).
  const events = 0;

  const newRating = Math.round(reputation + activity + achievements + referralQuality + events + content);

  const delta = newRating - user.rating;
  if (delta === 0) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { rating: newRating } }),
    prisma.ratingHistory.create({ data: { userId, delta, reason, source } }),
  ]);
}
