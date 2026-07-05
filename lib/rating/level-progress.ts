import type { User } from "@prisma/client";
import { LEVEL_NAMES } from "./levels";

export type ProgressCriterion = {
  label: string;
  met: boolean | null; // null = not computable yet (no tracked metric)
};

export type LevelProgress = {
  nextLevelName: string | null;
  criteria: ProgressCriterion[];
  isManualAppointment: boolean;
};

/**
 * Progress toward the next level, per PRODUCT.md §2's documented
 * requirements. Only criteria with a real, trackable metric get a
 * true/false checkmark (reputation, referral count, and — as of v0.6 —
 * has-published-content). "Steady activity" / "high activity" aren't
 * quantified anywhere in the source docs, so they're shown as
 * requirements, not fabricated as computed checkmarks (met: null). See
 * `lib/rating/level-progression.ts#checkLevelUp` for the promotion logic
 * that acts on the real criteria.
 */
export function getLevelProgress(
  user: User,
  opts: { hasPublishedContent?: boolean } = {},
): LevelProgress {
  const reputation = Number(user.reputation);

  if (user.level === 1) {
    return {
      nextLevelName: LEVEL_NAMES[2],
      isManualAppointment: false,
      criteria: [
        { label: "Steady activity", met: null },
        { label: "Reputation 2+ stars", met: reputation >= 2 },
        { label: "At least one quality invitation", met: user.referralCount >= 1 },
      ],
    };
  }

  if (user.level === 2) {
    return {
      nextLevelName: LEVEL_NAMES[3],
      isManualAppointment: false,
      criteria: [
        { label: "High activity", met: null },
        { label: "Reputation 3+ stars", met: reputation >= 3 },
        {
          // Only the "content" half of "content or events" is trackable
          // (no event-attendance data exists yet) — a real `true` when
          // they've published, `null` (unknown, not `false`) otherwise,
          // since they could still qualify via events we can't see.
          label: "Contribution to content or events",
          met: opts.hasPublishedContent === true ? true : null,
        },
      ],
    };
  }

  // PRODUCT.md §2: Warden/Master/Council are appointed, not earned via a
  // checklist ("назначается вручную" / "по личному приглашению") — no
  // progress bar to fabricate past Level III.
  return {
    nextLevelName: user.level < 6 ? LEVEL_NAMES[user.level + 1] : null,
    isManualAppointment: true,
    criteria: [],
  };
}
