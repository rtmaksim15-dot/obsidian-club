import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { RepCategory } from "@prisma/client";
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
};

export type AwardRepResult =
  | { outcome: "duplicate"; delta: number; repHistoryId: string }
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

  return prisma.$transaction(async (tx) => {
    const dup = await findDuplicate(tx, input.userId, input.sourceType, input.sourceId, input.reasonCode);
    if (dup) return { outcome: "duplicate", delta: dup.delta, repHistoryId: dup.id };

    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { rep: true, trustStars: true, titleLevel: true, councilEligible: true },
    });

    const multiplier = def.category === "ADJUSTMENT" ? 1 : multiplierForStars(user.trustStars);
    let delta = Math.round(base * multiplier);

    let capped = false;
    const cap = CATEGORY_MONTHLY_CAP[def.category];
    if (cap !== undefined && !input.grantedBy) {
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
        titleLevel: Math.max(user.titleLevel, title.level),
        councilEligible: user.councilEligible || newRep >= COUNCIL_THRESHOLD,
      },
    });

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

/** Repair tool — rebuilds `User.rep` from the full ledger (every row,
 * legacy and new-path alike: "score = sum of ledger deltas" is already
 * true for both). titleLevel/councilEligible are recomputed the same
 * high-water-mark way as the live award path. */
export async function recomputeUser(userId: string): Promise<{ rep: number; titleLevel: number; councilEligible: boolean }> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.repHistory.aggregate({ where: { userId }, _sum: { delta: true } });
    const rep = agg._sum.delta ?? 0;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { titleLevel: true, councilEligible: true } });
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
