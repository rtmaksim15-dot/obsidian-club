import type { User } from "@prisma/client";

export type ProgressCriterion = {
  label: string;
  met: boolean | null; // null = not computable yet (no tracked metric)
};

export type LevelProgress = {
  nextLevelName: string | null;
  criteria: ProgressCriterion[];
  isManualAppointment: boolean;
};

const LEVEL_NAMES: Record<number, string> = {
  1: "Initiate",
  2: "Member",
  3: "Senior Member",
  4: "Mentor",
  5: "Master",
  6: "Council Member",
};

/**
 * Progress toward the next level, per PRODUCT.md §2's documented
 * requirements. Only criteria with a real, trackable metric get a
 * true/false checkmark (reputation, referral count) — "steady activity" /
 * "high activity" / "content or event contribution" aren't quantified
 * anywhere in the source docs, so they're shown as requirements, not
 * fabricated as computed checkmarks (met: null).
 */
export function getLevelProgress(user: User): LevelProgress {
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
        { label: "Contribution to content or events", met: null },
      ],
    };
  }

  // PRODUCT.md §2: Mentor/Master/Council are appointed, not earned via a
  // checklist ("назначается вручную" / "по личному приглашению") — no
  // progress bar to fabricate past Level III.
  return {
    nextLevelName: user.level < 6 ? LEVEL_NAMES[user.level + 1] : null,
    isManualAppointment: true,
    criteria: [],
  };
}
