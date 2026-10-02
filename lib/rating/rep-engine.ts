import { prisma } from "@/lib/db/prisma";
import * as ledger from "@/lib/rep/ledger";

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
 *
 * `houseJoined`, `firstPost`, `housePost` added 2026-07-16 (REP system +
 * Vault task) — Houses/first-post didn't exist when the 2026-07-05 table
 * was authored. `invitedNewMember` changed 300 -> 15 the same day, per
 * Max's explicit call: the same task specified +15 for this event, and
 * he confirmed it replaces the old figure rather than stacking with it.
 */
export const REP_TABLE = {
  earn: {
    profileComplete: { points: 100, wired: true, note: "lib/rating/rep-engine.ts#checkProfileCompleteBonus" },
    verificationPassed: { points: 200, wired: true, note: "admin approval, app/api/admin/applications/[id]/route.ts" },
    firstCommunityIntro: { points: 100, wired: true, note: "Initiation Ritual step 4, lib/auth/ritual.ts" },
    dailyLogin: { points: 5, wired: true, note: "lib/rating/rep-engine.ts#touchDailyLogin" },
    streak7Day: { points: 50, wired: true, note: "lib/rating/rep-engine.ts#touchDailyLogin" },
    streak30Day: { points: 300, wired: true, note: "lib/rating/rep-engine.ts#touchDailyLogin" },
    houseJoined: { points: 10, wired: true, note: "app/api/houses/[slug]/join/route.ts, one-time per house" },
    firstPost: { points: 5, wired: true, note: "app/api/posts/route.ts, one-time (first published post ever)" },
    housePost: { points: 2, wired: true, note: "app/api/posts/route.ts, per house-tagged post, daily cap 10" },
    offlineMeetupAttended: { points: 200, wired: false, note: "no real Events attendance yet" },
    majorEventAttended: { points: 500, wired: false, note: "no real Events attendance yet" },
    eventOrganized: { points: 1000, wired: false, note: "no real Events creation yet" },
    invitedNewMember: { points: 15, wired: true, note: "admin approval w/ referral, app/api/admin/applications/[id]/route.ts" },
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
 * Package 1b (2026-10-01, see DECISIONS.md) — maps this function's
 * long-standing (source-prefix, points) pairs onto a lib/rep/config.ts
 * `REASON_CATALOG` entry, so `awardRep` below can delegate its actual
 * write to lib/rep/ledger.ts instead of doing its own `$transaction`
 * array, making that module the single real writer of `rep_history`.
 * `source` here is the part before any `:` (see `splitSource` below) —
 * e.g. `"invitee-level-2:${userId}"` arrives as prefix `"invitee-level-2"`.
 * Throws for anything unmapped, deliberately: a new call site must add an
 * entry here (and a matching one in lib/rep/config.ts#REASON_CATALOG)
 * rather than silently falling through.
 */
function legacyReasonCode(sourcePrefix: string, points: number): string {
  switch (sourcePrefix) {
    case "login-streak":
      if (points === REP_TABLE.earn.dailyLogin.points) return "daily_login";
      if (points === REP_TABLE.earn.streak7Day.points) return "login_streak_7";
      if (points === REP_TABLE.earn.streak30Day.points) return "login_streak_30";
      break;
    case "profile-complete":
      return "profile_complete";
    case "first-post":
      return "first_post";
    case "house-post":
      return "house_post";
    case "house-joined":
      return "house_joined";
    case "first-community-intro":
      return "first_community_intro";
    case "invitee-level-2":
      return "invitee_level_2";
    case "referral-active-90d":
      return "invitee_active_90d";
  }
  throw new Error(
    `awardRep: no REP catalog mapping for source "${sourcePrefix}" at ${points} points — ` +
      `add one to lib/rep/config.ts#REASON_CATALOG and lib/rating/rep-engine.ts#legacyReasonCode.`,
  );
}

/** Splits "prefix:id" into { sourceType: "prefix", sourceId: "id" }, or
 * just { sourceType: source } when there's no colon. */
function splitSource(source: string): { sourceType: string; sourceId?: string } {
  const i = source.indexOf(":");
  if (i === -1) return { sourceType: source };
  return { sourceType: source.slice(0, i), sourceId: source.slice(i + 1) };
}

/**
 * Awards (or deducts) REP and logs the change to `RepHistory` — the
 * ledger IS the score (`User.rep` is just a cached running total, kept
 * in sync here). Call this at the moment an earn/lose event in
 * `REP_TABLE` actually happens; don't call it speculatively.
 *
 * Package 1b (2026-10-01) — this function's signature and behavior are
 * unchanged for every caller (all nine existing call sites compile and
 * behave exactly as before); internally it now delegates the actual
 * database write to lib/rep/ledger.ts, the single real writer of
 * `rep_history` going forward. `reason`/`source` are still written
 * verbatim to RepHistory's original two text columns (via
 * `legacyReason`/`legacySource`), so the existing `/hall`/`/profile` REP-
 * history UI — which reads those two columns directly — renders every
 * row exactly as it did before this change, legacy or new. Every mapped
 * reason passes `bypassCap: true`: the ACTIVITY/INVITED monthly caps are
 * a new package-1 concept that never existed for these flows, and
 * silently capping years of already-live behavior would be exactly the
 * kind of behavior change this refactor isn't supposed to make — see
 * lib/rep/config.ts's REASON_CATALOG comment on these entries.
 *
 * The `rep.granted` analytics event (SPEC-analytics-panel.md §2.2) still
 * lands in the SAME transaction as the grant, via lib/rep/ledger.ts's
 * `emitAnalyticsEvent` option — that guarantee predates this refactor and
 * is preserved exactly, not relaxed to a follow-up write.
 */
export async function awardRep(userId: string, points: number, reason: string, source: string) {
  if (points === 0) return;

  const analytics = { type: "rep.granted", meta: { amount: points, reason, sourceEvent: source } };

  if (source === "admin-adjustment") {
    await ledger.applyAdjustment({
      userId,
      delta: points,
      reasonCode: "admin_adjustment",
      sourceType: source,
      legacyReason: reason,
      legacySource: source,
      note: reason,
      emitAnalyticsEvent: analytics,
    });
    return;
  }

  const { sourceType, sourceId } = splitSource(source);
  const reasonCode = legacyReasonCode(sourceType, points);

  await ledger.awardRep({
    userId,
    reasonCode,
    value: points,
    sourceType,
    sourceId,
    bypassCap: true,
    legacyReason: reason,
    legacySource: source,
    emitAnalyticsEvent: analytics,
  });
}

/**
 * Same as `awardRep`, but skips the award once `source`'s total for
 * today already reaches `dailyCap` — used for `housePost` (+2/post,
 * capped at +10/day, i.e. the 6th+ house-tagged post in a day earns no
 * REP). "Today" is UTC-day, matching `touchDailyLogin`'s convention.
 */
export async function awardRepWithDailyCap(
  userId: string,
  points: number,
  reason: string,
  source: string,
  dailyCap: number,
) {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const todaysTotal = await prisma.repHistory.aggregate({
    where: { userId, source, createdAt: { gte: startOfDay } },
    _sum: { delta: true },
  });
  const soFar = todaysTotal._sum.delta ?? 0;
  if (soFar >= dailyCap) return;

  await awardRep(userId, points, reason, source);
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
 * `/profile/edit`). Call after a profile edit save; no-ops if
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
