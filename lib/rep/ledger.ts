import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Prisma, RepCategory } from "@prisma/client";
import {
  CATEGORY_MONTHLY_CAP,
  clampTrustStars,
  COUNCIL_THRESHOLD,
  nameForTitleLevel,
  REASON_CATALOG,
  titleFor,
  TRUST_STAR_MULTIPLIER,
} from "./config";

function multiplierForStars(stars: number): number {
  return TRUST_STAR_MULTIPLIER[clampTrustStars(stars)];
}

/**
 * REP core engine extension (2026-10-01, see DECISIONS.md and
 * docs/REP_AUDIT.md) — a second, categorized/capped/multiplier-aware
 * award path onto the SAME `rep_history` table and SAME `User.rep` cached
 * sum that lib/rating/rep-engine.ts#awardRep already writes. That
 * function and its call sites are untouched; this module is additive and,
 * per this package's scope, not called from anywhere yet (package 2).
 *
 * Every function here is an interactive `$transaction` (read-then-write
 * atomically), unlike rep-engine.ts's array-form transaction — needed so
 * the monthly-cap check and the write can't race under concurrency.
 */

// Derived from prisma.$transaction's own callback param type (same
// convention as lib/dm/eligibility.ts#Client), not the generated
// Prisma.TransactionClient directly — lib/db/prisma.ts's $extends wrapper
// mints its own transaction-client type distinct from the unextended one.
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function monthStartUTC(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function monthUsedForCategory(tx: Tx, userId: string, category: RepCategory, now: Date): Promise<number> {
  const agg = await tx.repHistory.aggregate({
    where: { userId, category, delta: { gt: 0 }, grantedById: null, createdAt: { gte: monthStartUTC(now) } },
    _sum: { delta: true },
  });
  return agg._sum.delta ?? 0;
}

function resolveValue(reasonCode: string, value: number | undefined): number {
  const def = REASON_CATALOG[reasonCode];
  if (!def) throw new Error(`Unknown REP reason code: "${reasonCode}"`);
  const resolved = value ?? (def.min === def.max ? def.max : undefined);
  if (resolved === undefined) {
    throw new Error(`"${reasonCode}" requires an explicit value (range ${def.min}..${def.max}).`);
  }
  if (resolved < def.min || resolved > def.max) {
    throw new Error(`value ${resolved} out of range for "${reasonCode}" (${def.min}..${def.max}).`);
  }
  return resolved;
}

async function findDuplicate(tx: Tx, userId: string, sourceType: string, sourceId: string | undefined, reasonCode: string) {
  if (!sourceId) return null;
  return tx.repHistory.findUnique({
    where: { userId_sourceType_sourceId_reasonCode: { userId, sourceType, sourceId, reasonCode } },
  });
}

/** Opt-in same-transaction AnalyticsEvent write. Used by
 * lib/rating/rep-engine.ts's legacy delegation layer to preserve the
 * pre-existing "rep.granted written in the same transaction as the grant"
 * guarantee (SPEC-analytics-panel.md §2.2, see that file's own prior
 * comment). A new (package 2+) caller should normally use
 * lib/analytics/track.ts instead — this exists for legacy parity, not as
 * the general-purpose way to log a REP-related analytics event. */
type AnalyticsEventSpec = { type: string; meta?: Record<string, unknown> };

/** `actualDelta` overrides any `amount` the caller put in `spec.meta` —
 * package 1d (2026-10-02): once the catalog re-prices a reason, the
 * caller's own pre-computed "amount" (still the old, legacy point value
 * at the call site in lib/rating/rep-engine.ts) no longer matches what
 * actually got written. The real, just-resolved delta is always what
 * lands in the event. */
async function emitAnalyticsEvent(tx: Tx, userId: string, spec: AnalyticsEventSpec | undefined, actualDelta: number) {
  if (!spec) return;
  await tx.analyticsEvent.create({
    data: { userId, type: spec.type, meta: { ...spec.meta, amount: actualDelta } as Prisma.InputJsonValue },
  });
}

export type AwardRepInput = {
  userId: string;
  reasonCode: string;
  value?: number;
  sourceType: string;
  sourceId?: string;
  /** Admin/founder user id. When set, this award bypasses the category's
   * monthly cap entirely (it still gets the trust multiplier, unless the
   * reason's category is ADJUSTMENT). */
  grantedBy?: string;
  note?: string;
  /** Package 1b (2026-10-01) — skips the monthly-cap check regardless of
   * `grantedBy`. Used only by lib/rating/rep-engine.ts's legacy delegation
   * layer, to preserve pre-existing uncapped behavior for call sites that
   * predate the cap concept entirely (daily login, first post, etc.). Do
   * not set this from a new (package 2+) call site. */
  bypassCap?: boolean;
  /** Package 1b — legacy-compat free text for RepHistory's pre-existing
   * `reason`/`source` columns, so rows written through this new path still
   * render correctly in the existing `/hall`/`/profile` REP-history UI,
   * which reads those two columns directly and knows nothing about
   * `reasonCode`/`sourceType`. New (package 2+) callers should omit these —
   * they fall back to `reasonCode`/`sourceType` themselves. */
  legacyReason?: string;
  legacySource?: string;
  /** See emitAnalyticsEvent above — legacy delegation parity only. */
  emitAnalyticsEvent?: AnalyticsEventSpec;
};

export type AwardRepResult =
  | { outcome: "duplicate"; delta: number; repHistoryId: string }
  | { outcome: "no_reward"; delta: 0 }
  | { outcome: "capped"; delta: 0 }
  | { outcome: "awarded"; delta: number; capped: boolean; repHistoryId: string };

/** Earning path — ACTIVITY/CLUB_VALUE/INVITED, or a positive BEHAVIOR
 * reason (clean_quarter), or ADJUSTMENT. Negative (penalty) reasons are
 * rejected here — use applyPenalty for those. */
export async function awardRep(input: AwardRepInput): Promise<AwardRepResult> {
  const def = REASON_CATALOG[input.reasonCode];
  if (!def) throw new Error(`Unknown REP reason code: "${input.reasonCode}"`);
  if (def.max < 0) throw new Error(`"${input.reasonCode}" is a penalty reason — use applyPenalty() instead.`);

  const base = resolveValue(input.reasonCode, input.value);
  // Package 1d (2026-10-02, see DECISIONS.md) — a reason re-priced to 0
  // (e.g. daily_login) writes NO rep_history row at all, not a 0-delta
  // one: short-circuit before the transaction even opens, same as
  // lib/rating/rep-engine.ts's old `if (points === 0) return;` guard.
  if (base === 0) return { outcome: "no_reward", delta: 0 };

  return prisma.$transaction(async (tx) => {
    const dup = await findDuplicate(tx, input.userId, input.sourceType, input.sourceId, input.reasonCode);
    if (dup) return { outcome: "duplicate", delta: dup.delta, repHistoryId: dup.id };

    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { rep: true, trustStars: true, titleLevel: true, councilEligible: true, repExempt: true },
    });

    const multiplier = def.category === "ADJUSTMENT" ? 1 : multiplierForStars(user.trustStars);
    let delta = Math.round(base * multiplier);

    let capped = false;
    const cap = CATEGORY_MONTHLY_CAP[def.category];
    if (cap !== undefined && !input.grantedBy && !input.bypassCap) {
      const used = await monthUsedForCategory(tx, input.userId, def.category, new Date());
      const remaining = Math.max(0, cap - used);
      if (delta > remaining) {
        delta = remaining;
        capped = true;
      }
    }
    if (delta <= 0) return { outcome: "capped", delta: 0 };

    const newRep = user.rep + delta;
    const title = titleFor(newRep);

    const row = await tx.repHistory.create({
      data: {
        userId: input.userId,
        delta,
        reason: input.legacyReason,
        source: input.legacySource,
        category: def.category,
        baseDelta: base,
        multiplier,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        reasonCode: input.reasonCode,
        note: input.note,
        grantedById: input.grantedBy ?? null,
      },
    });
    await tx.user.update({
      where: { id: input.userId },
      data: {
        rep: { increment: delta },
        // repExempt (Lord Obsidian) — the ledger row above still writes
        // normally, but title/council are never computed for this account.
        ...(user.repExempt
          ? {}
          : {
              titleLevel: Math.max(user.titleLevel, title.level),
              councilEligible: user.councilEligible || newRep >= COUNCIL_THRESHOLD,
            }),
      },
    });
    await emitAnalyticsEvent(tx, input.userId, input.emitAnalyticsEvent, delta);

    return { outcome: "awarded", delta, capped, repHistoryId: row.id };
  });
}

export type ApplyPenaltyInput = {
  userId: string;
  reasonCode: string;
  value?: number;
  /** Change to trust_stars (e.g. -1), clamped to 1..5. Not auto-derived
   * from reasonCode — the caller decides, per this function's spec. */
  starDelta?: number;
  /** Required — every penalty is admin/founder-attributed. */
  grantedBy: string;
  sourceType: string;
  sourceId?: string;
  note?: string;
  /** See AwardRepInput#legacyReason/legacySource. */
  legacyReason?: string;
  legacySource?: string;
};

export type ApplyPenaltyResult =
  | { outcome: "duplicate"; delta: number; repHistoryId: string }
  | { outcome: "applied"; delta: number; repHistoryId: string; trustStars: number };

/** Penalty path — BEHAVIOR negative reasons only. Never multiplied, never
 * capped; `grantedBy` is mandatory. */
export async function applyPenalty(input: ApplyPenaltyInput): Promise<ApplyPenaltyResult> {
  const def = REASON_CATALOG[input.reasonCode];
  if (!def) throw new Error(`Unknown REP reason code: "${input.reasonCode}"`);
  if (def.max >= 0) throw new Error(`"${input.reasonCode}" is not a penalty reason — use awardRep() instead.`);
  if (!input.grantedBy) throw new Error("applyPenalty requires grantedBy.");

  const delta = resolveValue(input.reasonCode, input.value);

  return prisma.$transaction(async (tx) => {
    const dup = await findDuplicate(tx, input.userId, input.sourceType, input.sourceId, input.reasonCode);
    if (dup) return { outcome: "duplicate", delta: dup.delta, repHistoryId: dup.id };

    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { trustStars: true },
    });
    const newStars = input.starDelta ? clampTrustStars(user.trustStars + input.starDelta) : user.trustStars;

    const row = await tx.repHistory.create({
      data: {
        userId: input.userId,
        delta,
        reason: input.legacyReason,
        source: input.legacySource,
        category: "BEHAVIOR",
        baseDelta: delta,
        multiplier: 1,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        reasonCode: input.reasonCode,
        note: input.note,
        grantedById: input.grantedBy,
      },
    });
    await tx.user.update({
      where: { id: input.userId },
      data: { rep: { increment: delta }, trustStars: newStars },
      // titleLevel is a high-water mark — a penalty lowering `rep` never
      // lowers it, so it's deliberately not touched here.
    });

    return { outcome: "applied", delta, repHistoryId: row.id, trustStars: newStars };
  });
}

export type ApplyAdjustmentInput = {
  userId: string;
  /** Arbitrary non-zero integer, either sign — not validated against
   * REASON_CATALOG (there's no fixed range for "whatever an admin typed"
   * or a scale-migration multiple of someone's existing total). */
  delta: number;
  /** Defaults to "admin_adjustment" (the legacy admin-rep-adjustment
   * route's delegation target). The scale-migration script passes its own
   * ("scale_migration") so the two are never confused in the ledger. */
  reasonCode?: string;
  sourceType: string;
  sourceId?: string;
  /** Optional, unlike applyPenalty — the legacy admin-rep-adjustment route
   * (app/api/admin/rep-adjustment/route.ts) never threaded the admin's id
   * into awardRep's generic (userId, points, reason, source) signature, and
   * this package can't change that signature (existing callers must keep
   * compiling unchanged). Pass it when the caller actually has it (e.g.
   * the scale-migration script could, but doesn't act "as" a specific
   * admin, so it also omits this). */
  grantedBy?: string;
  note?: string;
  legacyReason?: string;
  legacySource?: string;
  emitAnalyticsEvent?: AnalyticsEventSpec;
};

export type ApplyAdjustmentResult =
  | { outcome: "duplicate"; delta: number; repHistoryId: string }
  | { outcome: "applied"; delta: number; repHistoryId: string };

/** Direct ADJUSTMENT-category write — never multiplied, never capped,
 * value taken exactly as given (no REASON_CATALOG lookup at all). For
 * manual corrections (admin rep-adjustment) and bulk corrections (the
 * REP scale migration) — anything that is, by definition, "set this
 * account's REP by exactly this amount," not an earned or cataloged
 * amount. */
export async function applyAdjustment(input: ApplyAdjustmentInput): Promise<ApplyAdjustmentResult> {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new Error("applyAdjustment requires a non-zero integer delta.");
  }
  const reasonCode = input.reasonCode ?? "admin_adjustment";

  return prisma.$transaction(async (tx) => {
    const dup = await findDuplicate(tx, input.userId, input.sourceType, input.sourceId, reasonCode);
    if (dup) return { outcome: "duplicate", delta: dup.delta, repHistoryId: dup.id };

    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { rep: true, titleLevel: true, councilEligible: true, repExempt: true },
    });
    const newRep = user.rep + input.delta;
    const title = titleFor(newRep);

    const row = await tx.repHistory.create({
      data: {
        userId: input.userId,
        delta: input.delta,
        reason: input.legacyReason,
        source: input.legacySource,
        category: "ADJUSTMENT",
        baseDelta: input.delta,
        multiplier: 1,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        reasonCode,
        note: input.note,
        grantedById: input.grantedBy ?? null,
      },
    });
    await tx.user.update({
      where: { id: input.userId },
      data: {
        rep: { increment: input.delta },
        ...(user.repExempt
          ? {}
          : {
              titleLevel: Math.max(user.titleLevel, title.level),
              councilEligible: user.councilEligible || newRep >= COUNCIL_THRESHOLD,
            }),
      },
    });
    await emitAnalyticsEvent(tx, input.userId, input.emitAnalyticsEvent, input.delta);

    return { outcome: "applied", delta: input.delta, repHistoryId: row.id };
  });
}

/** Repair tool — rebuilds `User.rep` from the full ledger (every row,
 * legacy and new-path alike: "score = sum of ledger deltas" is already
 * true for both). titleLevel/councilEligible are recomputed the same
 * high-water-mark way as the live award path. */
export async function recomputeUser(userId: string): Promise<{ rep: number; titleLevel: number; councilEligible: boolean }> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.repHistory.aggregate({ where: { userId }, _sum: { delta: true } });
    const rep = agg._sum.delta ?? 0;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { titleLevel: true, councilEligible: true, repExempt: true },
    });

    if (user.repExempt) {
      // rep itself is still rebuilt from the real ledger (history stays
      // real and auditable); title/council are frozen, never recomputed.
      await tx.user.update({ where: { id: userId }, data: { rep } });
      return { rep, titleLevel: user.titleLevel, councilEligible: user.councilEligible };
    }

    const title = titleFor(rep);
    const titleLevel = Math.max(user.titleLevel, title.level);
    const councilEligible = user.councilEligible || rep >= COUNCIL_THRESHOLD;

    await tx.user.update({ where: { id: userId }, data: { rep, titleLevel, councilEligible } });
    return { rep, titleLevel, councilEligible };
  });
}

export type RepSummary = {
  repScore: number;
  titleLevel: number;
  titleName: string;
  councilEligible: boolean;
  monthUsedByCategory: Partial<Record<RepCategory, number>>;
};

/** Read model for display — not wired into any page in this package. REP
 * number visibility rules (owner/admin only) are package 3's concern;
 * this function just computes the value, same data-access shape the
 * existing `/hall`/`/profile` pages already use for `user.rep`. */
export async function getRepSummary(userId: string): Promise<RepSummary> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { rep: true, titleLevel: true, councilEligible: true },
  });
  const title = titleFor(user.rep);
  const titleLevel = Math.max(user.titleLevel, title.level);

  const now = new Date();
  const rows = await prisma.repHistory.groupBy({
    by: ["category"],
    where: {
      userId,
      delta: { gt: 0 },
      grantedById: null,
      category: { not: null },
      createdAt: { gte: monthStartUTC(now) },
    },
    _sum: { delta: true },
  });
  const monthUsedByCategory: Partial<Record<RepCategory, number>> = {};
  for (const row of rows) {
    if (row.category) monthUsedByCategory[row.category] = row._sum.delta ?? 0;
  }

  return {
    repScore: Math.max(0, user.rep),
    titleLevel,
    titleName: nameForTitleLevel(titleLevel),
    councilEligible: user.councilEligible,
    monthUsedByCategory,
  };
}

export { titleFor } from "./config";
