import "server-only";
import { prisma } from "@/lib/db/prisma";
import { errCode } from "@/lib/utils/safe-error";

/**
 * Mandatory/safety retention categories (security package 4, FIX 13,
 * 2026-10-05, see DECISIONS.md). Deliberately a SEPARATE constant from
 * lib/moderation/report.ts's REPORT_CATEGORIES/isRedLineCategory(),
 * even though the three values are identical today — that set exists
 * to trigger Post.isPreserved + report-priority UI (a product
 * decision); this one exists to decide what the 90-day retention
 * cleanup below must never touch (a legal/safety decision). Keeping
 * them independently declared means a future change to one doesn't
 * silently change the other's meaning. Owner's explicit decision.
 *
 * Each category is listed for its own, separately-tracked reason, on
 * purpose — if one reason stops applying, the other still holds on its
 * own merits:
 */
export const MANDATORY_RETENTION_CATEGORIES: readonly string[] = [
  // 18 U.S.C. §2258A — mandatory preservation duty, not discretionary.
  "underage",
  "non_consensual",
  // NOT a §2258A obligation. Retained as evidence of a safety threat to
  // a member, in case of a future police report.
  "threat",
];

export function requiresMandatoryRetention(category: string | null | undefined): boolean {
  return category != null && MANDATORY_RETENTION_CATEGORIES.includes(category);
}

/** 90 days — see DECISIONS.md for why this number, and for the
 * red-line exception above. Shared by both cleanup passes below so
 * the two policies (note fragments, full deleted content) can't drift
 * apart from each other by accident. */
const RETENTION_DAYS = 90;

function cutoffDate(): Date {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** Replaces the trailing `: "...quoted fragment..."` in a
 * ModerationAction.note with a redaction marker. Greedy `.*` (not
 * `[^"]*`) deliberately — a fragment that itself contains a `"` would
 * break a non-greedy match; greedy backtracks to the LAST `"` before
 * the end of the string, which is always the note's real closing quote
 * (these notes are always built as `${prefix}: "${fragment}"`, nothing
 * ever follows the closing quote). Returns the input unchanged if the
 * pattern isn't found (e.g. a restore/report note with no fragment at
 * all) — callers should skip the write in that case. */
function redactNoteFragment(note: string): string {
  return note.replace(/: ".*"$/, `: [content redacted after ${RETENTION_DAYS}-day retention]`);
}

/**
 * Opportunistic, non-blocking retention sweep — no cron infra in this
 * project (same reasoning as lib/security/rate-limit.ts#maybeCleanup,
 * which this mirrors: a small random chance per call, rather than a
 * scheduled job). Hooked into lib/moderation/log.ts#logModerationAction,
 * which fires on every admin moderation action across the whole admin
 * surface — frequent enough to keep this from growing unbounded.
 *
 * Two independent passes, both skipping any row already marked
 * `preserveIndefinitely`:
 *   1. ModerationAction.note — strips the quoted content fragment past
 *      90 days from `createdAt` (FIX 13).
 *   2. Message/Comment.content — replaces the full text with
 *      "[removed]" past 90 days from `deletedAt`, soft-deleted rows
 *      only; `isDeleted`/`deletedAt`/`deletedById` are never touched
 *      (the owner's explicit instruction — moderation history survives,
 *      only the text goes).
 */
export async function maybeRunRetentionCleanup(): Promise<void> {
  if (Math.random() > 0.02) return;
  const cutoff = cutoffDate();

  try {
    const staleNotes = await prisma.moderationAction.findMany({
      where: { createdAt: { lt: cutoff }, preserveIndefinitely: false, note: { contains: ': "' } },
      select: { id: true, note: true },
    });
    for (const row of staleNotes) {
      if (!row.note) continue;
      const redacted = redactNoteFragment(row.note);
      if (redacted !== row.note) {
        await prisma.moderationAction.update({ where: { id: row.id }, data: { note: redacted } });
      }
    }
  } catch (err) {
    console.error("[retention] Note-fragment cleanup failed (non-fatal):", errCode(err));
  }

  try {
    await prisma.message.updateMany({
      where: { isDeleted: true, deletedAt: { lt: cutoff }, preserveIndefinitely: false, content: { not: "[removed]" } },
      data: { content: "[removed]" },
    });
    await prisma.comment.updateMany({
      where: { isDeleted: true, deletedAt: { lt: cutoff }, preserveIndefinitely: false, content: { not: "[removed]" } },
      data: { content: "[removed]" },
    });
  } catch (err) {
    console.error("[retention] Deleted-content cleanup failed (non-fatal):", errCode(err));
  }
}
