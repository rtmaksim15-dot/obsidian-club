import type { RepCategory } from "@prisma/client";

/**
 * REP core engine extension (2026-10-01, see DECISIONS.md and
 * docs/REP_AUDIT.md) — configuration for the new categorized/capped/
 * multiplier-aware award path in lib/rep/ledger.ts. This sits alongside
 * the existing lib/rating/rep-engine.ts#REP_TABLE, which keeps writing
 * uncategorized rows for its existing call sites exactly as before; this
 * catalog is for new call sites only (not wired into any feature in this
 * package).
 */

/** REP-based title, independent of `User.level` (which tracks `reputation`,
 * the star average — see docs/REP_AUDIT.md §4). High-water mark: a title
 * never drops even if `rep` later drops from a penalty. */
export const REP_TITLES = [
  { level: 1, name: "Initiate", min: 0 },
  { level: 2, name: "Keeper", min: 1000 },
  { level: 3, name: "Steward", min: 2500 },
  { level: 4, name: "Warden", min: 5000 },
  { level: 5, name: "Master", min: 10000 },
] as const;

/** Council (tier VI) is never automatic — crossing this only sets
 * `User.councilEligible`, it never advances `titleLevel` to 6. */
export const COUNCIL_THRESHOLD = 20000;

export function titleFor(repScore: number): { level: number; name: string } {
  let best: (typeof REP_TITLES)[number] = REP_TITLES[0];
  for (const t of REP_TITLES) {
    if (repScore >= t.min) best = t;
  }
  return { level: best.level, name: best.name };
}

/** Name for an already-resolved title level (e.g. a stored high-water
 * `titleLevel`) — use this instead of re-deriving from a possibly-lower
 * current `rep` after a penalty. Falls back to the lowest title for any
 * out-of-range level rather than throwing. */
export function nameForTitleLevel(level: number): string {
  const match = REP_TITLES.find((t) => t.level === level);
  return (match ?? REP_TITLES[0]).name;
}

/** Monthly cap (UTC calendar month, sum of positive deltas) per earning
 * category. BEHAVIOR and ADJUSTMENT have no cap — penalties are never
 * capped, and ADJUSTMENT rows are direct admin corrections, not "earned"
 * amounts. A row with `grantedBy` set bypasses this cap entirely. */
export const CATEGORY_MONTHLY_CAP: Partial<Record<RepCategory, number>> = {
  ACTIVITY: 400,
  CLUB_VALUE: 600,
  INVITED: 300,
};

/** Multiplies POSITIVE deltas only (never penalties, never ADJUSTMENT —
 * see lib/rep/ledger.ts). Rounded to the nearest integer after applying. */
export const TRUST_STAR_MULTIPLIER: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 0.4,
  2: 0.7,
  3: 1.0,
  4: 1.1,
  5: 1.2,
};

export function clampTrustStars(stars: number): 1 | 2 | 3 | 4 | 5 {
  return Math.min(5, Math.max(1, Math.round(stars))) as 1 | 2 | 3 | 4 | 5;
}

type ReasonDef = {
  category: RepCategory;
  /** Allowed value range, inclusive. For a fixed-value reason, min === max
   * and the caller may omit `value` entirely. min may exceed... no — min is
   * always the numerically smaller bound (more negative for penalties). */
  min: number;
  max: number;
};

/**
 * Base-value catalog (before the trust multiplier). Positive entries are
 * awarded via lib/rep/ledger.ts#awardRep; negative (BEHAVIOR) entries are
 * awarded via lib/rep/ledger.ts#applyPenalty, which requires `grantedBy`
 * and never multiplies or caps the value. `codex_violation`'s documented
 * "+ star −1" is not auto-applied here — the caller passes `starDelta`
 * explicitly to `applyPenalty`, matching that function's own signature.
 */
export const REASON_CATALOG: Record<string, ReasonDef> = {
  // ACTIVITY
  profile_verified: { category: "ACTIVITY", min: 100, max: 100 },
  first_quality_post: { category: "ACTIVITY", min: 50, max: 50 },
  post_marked_useful: { category: "ACTIVITY", min: 30, max: 100 },
  reply_thanked: { category: "ACTIVITY", min: 20, max: 50 },
  helped_newcomer: { category: "ACTIVITY", min: 50, max: 50 },

  // CLUB_VALUE
  club_project: { category: "CLUB_VALUE", min: 100, max: 300 },
  event_organized: { category: "CLUB_VALUE", min: 200, max: 500 },
  event_attended: { category: "CLUB_VALUE", min: 50, max: 100 },
  product_feedback: { category: "CLUB_VALUE", min: 100, max: 300 },
  prototype_test: { category: "CLUB_VALUE", min: 100, max: 250 },

  // INVITED
  invitee_verified: { category: "INVITED", min: 100, max: 100 },
  invitee_active_30d: { category: "INVITED", min: 200, max: 200 },
  invitee_reached_keeper: { category: "INVITED", min: 200, max: 200 },

  // BEHAVIOR — clean_quarter via awardRep (positive); the rest via
  // applyPenalty (negative, grantedBy required, never multiplied/capped).
  clean_quarter: { category: "BEHAVIOR", min: 100, max: 100 },
  mod_warning: { category: "BEHAVIOR", min: -50, max: -50 },
  rule_violation: { category: "BEHAVIOR", min: -500, max: -200 },
  codex_violation: { category: "BEHAVIOR", min: -1000, max: -1000 },
  invite_abuse: { category: "BEHAVIOR", min: -500, max: -500 },

  // Package 1b (2026-10-01, see DECISIONS.md) — one entry per legacy
  // lib/rating/rep-engine.ts#awardRep call site, so that function can
  // delegate its actual write to lib/rep/ledger.ts while every existing
  // caller keeps compiling and behaving exactly as before. Values match
  // REP_TABLE in rep-engine.ts verbatim; category is this package's own
  // judgment call (not specified by the original CLAUDE.md earn table),
  // grouped by what the action actually is: self-directed activity vs.
  // a reward for someone the member invited. These are deliberately
  // NOT subject to the ACTIVITY/INVITED monthly cap above — that cap is
  // a new package-1 concept that never existed for these flows, and
  // retroactively capping years of already-live behavior would be a
  // silent change beyond "migrate the writer." The legacy delegation
  // layer passes `bypassCap: true` for every one of these — see
  // lib/rep/ledger.ts#AwardRepInput.
  daily_login: { category: "ACTIVITY", min: 5, max: 5 },
  login_streak_7: { category: "ACTIVITY", min: 50, max: 50 },
  login_streak_30: { category: "ACTIVITY", min: 300, max: 300 },
  profile_complete: { category: "ACTIVITY", min: 100, max: 100 }, // distinct from profile_verified above — this is the existing self-service "bio+avatar+city" bonus, not an admin verification
  first_post: { category: "ACTIVITY", min: 5, max: 5 }, // distinct from first_quality_post above
  house_post: { category: "ACTIVITY", min: 2, max: 2 }, // daily cap of 10 stays enforced by rep-engine.ts#awardRepWithDailyCap, unchanged
  house_joined: { category: "ACTIVITY", min: 10, max: 10 },
  first_community_intro: { category: "ACTIVITY", min: 100, max: 100 },
  invitee_level_2: { category: "INVITED", min: 500, max: 500 }, // "invitee reached Level II" (the reviews/level system, not titleLevel) — distinct from invitee_reached_keeper above
  invitee_active_90d: { category: "INVITED", min: 1000, max: 1000 }, // distinct from invitee_active_30d above (different duration, different value, pre-existing)
};

export type ReasonCode = keyof typeof REASON_CATALOG;
