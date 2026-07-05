import { prisma } from "@/lib/db/prisma";

/**
 * REP — CLAUDE.md's (2026-07-05) "Layer 2 — Reputation Score" earn/lose
 * table, verbatim. Replaces the old weighted `rating-engine.ts` formula
 * (ARCHITECTURE.md §5), which is superseded — see ADR-0015.
 *
 * `wired: true` entries are actually triggered somewhere in this codebase
 * today (see the call site listed). `wired: false` entries are real point
 * values from the source doc that can't be triggered yet because the
 * feature they depend on doesn't exist (events, moderation/reports,
 * marketplace, editorial review, thank-you reactions, challenges, club
 * missions) — kept here, not dropped, so nobody has to go re-derive them
 * from CLAUDE.md later. See TECH_DEBT.md for the feature gaps themselves.
 */
export const REP_TABLE = {
  earn: {
    profileComplete: { points: 100, wired: true, note: "lib/rating/rep-engine.ts#checkProfileCompleteBonus" },
    verificationPassed: { points: 200, wired: true, note: "admin approval, app/api/admin/applications/[id]/route.ts" },
    firstCommunityIntro: { points: 100, wired: true, note: "Initiation Ritual step 4, lib/auth/ritual.ts" },
    dailyLogin: { points: 5, wired: true, note: "lib/rating/rep-engine.ts#touchDailyLogin" },
    streak7Day: { points: 50, wired: true, note: "lib/rating/rep-engine.ts#touchDailyLogin" },
    streak30Day: { points: 300, wired: true, note: "lib/rating/rep-engine.ts#touchDailyLogin" },
    offlineMeetupAttended: { points: 200, wired: false, note: "no real Events attendance yet" },
    majorEventAttended: { points: 500, wired: false, note: "no real Events attendance yet" },
    eventOrganized: { points: 1000, wired: false, note: "no real Events creation yet" },
    invitedNewMember: { points: 300, wired: true, note: "admin approval w/ referral, app/api/admin/applications/[id]/route.ts" },
    inviteeReachedLevel2: { points: 500, wired: true, note: "lib/rating/level-progression.ts" },
    inviteeActive90Days: { points: 1000, wired: true, note: "lib/rating/referral-lifecycle.ts" },
    usefulPost: { points: [50, 300], wired: false, note: "no post-quality/upvote mechanism exists" },
    articleApproved: { points: 1000, wired: false, note: "no editorial review workflow — posts publish immediately" },
    bestAnswerMarked: { points: 50, wired: false, note: "no Q&A / best-answer feature exists" },
    thankYouFromMember: { points: 10, wired: false, note: "no thank-you/reaction mechanism exists" },
    thankYouFromWardenPlus: { points: 50, wired: false, note: "no thank-you/reaction mechanism exists" },
    challengeWon: { points: 300, wired: false, note: "no challenges feature exists" },
    majorCompetitionWon: { points: 1000, wired: false, note: "no competitions feature exists" },
    clubMission: { points: [100, 500], wired: false, note: "no club missions feature exists" },
    volunteerHelp: { points: [200, 1000], wired: false, note: "no volunteer-tracking mechanism exists" },
    monthlyMembershipPurchase: { points: 50, wired: false, note: "no subscriptions/payments exist yet" },
    ocArtifactPurchased: { points: 50, wired: false, note: "no Shop/payments exist yet" },
  },
  lose: {
    reportConfirmed: { points: -100, wired: false, note: "no moderation/reporting system exists yet" },
    incorrectBehaviour: { points: -300, wired: false, note: "no moderation system exists yet" },
    eventDisruption: { points: [-2000, -500], wired: false, note: "no Events feature exists yet" },
    spam: { points: -500, wired: false, note: "no moderation system exists yet" },
    fraudAttempt: { points: [-5000, -2000], wired: false, note: "no moderation system exists yet" },
    grossViolation: { points: -5000, wired: false, note: "no moderation system exists yet" },
    exclusion: { points: "reset-to-0", wired: false, note: "no moderation/ban system exists yet" },
  },
} as const;

/**
 * Awards (or deducts) REP and logs the change to `RepHistory` — the
 * ledger IS the score (`User.rep` is just a cached running total, kept
 * in sync here). Call this at the moment an earn/lose event in
 * `REP_TABLE` actually happens; don't call it speculatively.
 */
export async function awardRep(userId: string, points: number, reason: string, source: string) {
  if (points === 0) return;

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { rep: { increment: points } } }),
    prisma.repHistory.create({ data: { userId, delta: points, reason, source } }),
  ]);
}

/**
 * Daily-login REP (CLAUDE.md: +5/day, +50 at a 7-day streak, +300 at a
 * 30-day streak). Call once per authenticated request that represents a
 * real visit (wired in `lib/auth/session.ts#getCurrentUser`, which can be
 * invoked more than once per page load) — the conditional `updateMany`
 * below only lets one concurrent call actually claim "today" (Postgres
 * serializes the two via the row lock, and the second sees its own WHERE
 * no longer match once the first commits), so this can't double-award
 * even when called concurrently for the same user.
 */
export async function touchDailyLogin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginDate: true, currentStreak: true, longestStreak: true },
  });
  if (!user) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const last = user.lastLoginDate ? new Date(user.lastLoginDate) : null;
  if (last) last.setUTCHours(0, 0, 0, 0);

  if (last && last.getTime() === today.getTime()) return; // fast path: already touched today

  const isConsecutive = last !== null && today.getTime() - last.getTime() === 24 * 60 * 60 * 1000;
  const newStreak = isConsecutive ? user.currentStreak + 1 : 1;

  const claimed = await prisma.user.updateMany({
    where: { id: userId, lastLoginDate: last ? new Date(last) : null },
    data: {
      lastLoginDate: today,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, user.longestStreak),
    },
  });
  if (claimed.count === 0) return; // a concurrent call already claimed today

  await awardRep(userId, REP_TABLE.earn.dailyLogin.points, "Daily login", "login-streak");

  if (newStreak === 7) {
    await awardRep(userId, REP_TABLE.earn.streak7Day.points, "7-day login streak", "login-streak");
  }
  if (newStreak === 30) {
    await awardRep(userId, REP_TABLE.earn.streak30Day.points, "30-day login streak", "login-streak");
  }
}

/**
 * Profile-100%-complete REP bonus (CLAUDE.md: +100, one-time). "100%"
 * here means the same fields the Initiation Ritual's step 1 already
 * checks (bio + avatar) plus city, since those are the only profile
 * fields with real user-facing edit UI (`lib/auth/ritual.ts`,
 * `/profile/[id]/edit`). Call after a profile edit save; no-ops if
 * already granted (checked via a RepHistory row, not a boolean flag —
 * avoids a schema addition for a one-time event).
 */
export async function checkProfileCompleteBonus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const complete = Boolean(user.bio && user.avatarUrl && user.locationCity);
  if (!complete) return;

  const alreadyGranted = await prisma.repHistory.findFirst({
    where: { userId, source: "profile-complete" },
  });
  if (alreadyGranted) return;

  await awardRep(userId, REP_TABLE.earn.profileComplete.points, "Profile 100% complete", "profile-complete");
}
