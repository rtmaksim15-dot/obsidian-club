// Newcomer Path (Package 5, Phase A, 2026-10-14, see DECISIONS.md) —
// pure core, no "server-only", no Prisma. The DB-touching wrapper is
// lib/newcomer-path/status.ts.
//
// Step 4 renamed "intro" -> "firstPost" in the same day's follow-up
// (see DECISIONS.md): it was "Speak in the Newcomers' Hall," which
// overlapped entirely with the Initiation Ritual's own "introduce
// yourself in the newcomers' room" requirement (already true for
// 100% of anyone who could ever see this card). Now "Leave your first
// mark" — the member's first real post in the Feed.
export type StepId = "profile" | "boundaries" | "limits" | "firstPost";

export const STEP_IDS: StepId[] = ["profile", "boundaries", "limits", "firstPost"];

export const STEPS: { id: StepId; label: string; href: string }[] = [
  { id: "profile", label: "Show your face to the Circle", href: "/profile/edit" },
  { id: "boundaries", label: "Draw your boundaries", href: "/boundaries" },
  { id: "limits", label: "Name your limits", href: "/profile/edit" },
  { id: "firstPost", label: "Leave your first mark", href: "/compose" },
];

export const STEP_REASON_CODE: Record<StepId, string> = {
  profile: "newcomer_profile",
  boundaries: "newcomer_boundaries",
  limits: "newcomer_limits",
  // Package 5 follow-up — `newcomer_intro` (the old step 4's reason
  // code) stays in REASON_CATALOG, unused, rather than deleted; see
  // that file's own comment.
  firstPost: "newcomer_first_post",
};

export const MIN_ABOUT_LENGTH_FOR_PROFILE_STEP = 40;

export type StepInputs = {
  hasAvatar: boolean;
  bioLength: number;
  boundariesSaved: boolean;
  hasLimitPractice: boolean;
  /** Any Feed-visible post (post/story type), published, text or image — "not deleted" per the task's own wording, i.e. still isPublished (preserving a post already clears that flag). */
  hasFirstPost: boolean;
};

/**
 * A1's four completion rules, computed fresh from current data every
 * time — never a stored flag, same "never a self-reported checkbox"
 * principle lib/auth/ritual.ts already uses for the Initiation Ritual.
 */
export function computeStepCompletion(inputs: StepInputs): Record<StepId, boolean> {
  return {
    profile: inputs.hasAvatar && inputs.bioLength >= MIN_ABOUT_LENGTH_FOR_PROFILE_STEP,
    boundaries: inputs.boundariesSaved,
    limits: inputs.hasLimitPractice,
    firstPost: inputs.hasFirstPost,
  };
}

export function allStepsComplete(completion: Record<StepId, boolean>): boolean {
  return STEP_IDS.every((id) => completion[id]);
}

/** 1 (the endowed "crossed the threshold" segment, always filled for anyone who reached /feed) + one per completed step. */
export function filledSegments(completion: Record<StepId, boolean>): number {
  return 1 + STEP_IDS.filter((id) => completion[id]).length;
}

export const TOTAL_SEGMENTS = 1 + STEP_IDS.length;

export type NewcomerPathSettings = {
  /** Set once, the first time this logic ever runs for a given member —
   * marks the moment steps already true got grandfathered in with no
   * REP (A5: no retro-award). */
  baselineComputedAt?: string;
  /** reasonCodes-as-StepIds already credited (grandfathered OR genuinely
   * earned) — the ledger's own (userId, sourceType, sourceId, reasonCode)
   * uniqueness is a second, independent safety net; this set is what
   * decides whether awardRep is even attempted. */
  awardedSteps?: StepId[];
  /** ISO timestamp — "Later" collapses the card until this passes. */
  dismissedUntil?: string;
  /** The one-time "The path is walked." message has already been shown. */
  completionAcknowledged?: boolean;
};

export type NewcomerPathDecision = {
  /** Steps to actually call awardRep() for on this run. Empty on the
   * very first (baseline) run, and on every run where nothing new
   * completed. */
  newlyAwardedSteps: StepId[];
  /** What to persist — identical to the input when nothing changed, so
   * the caller can skip the write entirely in that case. */
  updatedSettings: NewcomerPathSettings;
};

/**
 * The whole idempotent-award / no-retro-award rule (A2/A5), as one pure
 * decision: given what's already been credited and what's true right
 * now, decide what (if anything) is newly earned.
 */
export function decideNewcomerPathUpdate(
  settings: NewcomerPathSettings,
  completion: Record<StepId, boolean>,
): NewcomerPathDecision {
  const awarded = new Set(settings.awardedSteps ?? []);

  if (!settings.baselineComputedAt) {
    for (const id of STEP_IDS) {
      if (completion[id]) awarded.add(id);
    }
    return {
      newlyAwardedSteps: [],
      updatedSettings: {
        ...settings,
        baselineComputedAt: new Date().toISOString(),
        awardedSteps: STEP_IDS.filter((id) => awarded.has(id)),
      },
    };
  }

  const newlyAwardedSteps: StepId[] = [];
  for (const id of STEP_IDS) {
    if (completion[id] && !awarded.has(id)) {
      newlyAwardedSteps.push(id);
      awarded.add(id);
    }
  }

  if (newlyAwardedSteps.length === 0) {
    return { newlyAwardedSteps: [], updatedSettings: settings };
  }

  return {
    newlyAwardedSteps,
    updatedSettings: { ...settings, awardedSteps: STEP_IDS.filter((id) => awarded.has(id)) },
  };
}

export function isDismissed(settings: NewcomerPathSettings, now: Date = new Date()): boolean {
  return Boolean(settings.dismissedUntil && new Date(settings.dismissedUntil).getTime() > now.getTime());
}
