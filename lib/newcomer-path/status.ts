import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { awardRep } from "@/lib/rep/ledger";
import {
  computeStepCompletion,
  decideNewcomerPathUpdate,
  allStepsComplete,
  STEP_REASON_CODE,
  type NewcomerPathSettings,
  type StepId,
} from "./core";

export {
  STEPS,
  STEP_IDS,
  TOTAL_SEGMENTS,
  filledSegments,
  isDismissed,
  allStepsComplete,
  type StepId,
  type NewcomerPathSettings,
} from "./core";

export type NewcomerPathState = {
  completion: Record<StepId, boolean>;
  settings: NewcomerPathSettings;
  /** True only on the exact render where the path just became fully
   * complete and the one-time message hasn't been shown yet. */
  justCompleted: boolean;
};

/**
 * Newcomer Path (Package 5, Phase A, 2026-10-14, see DECISIONS.md) —
 * computes current step completion from real data, grandfathers in (no
 * REP) whatever's already true the first time this ever runs for a
 * given member (A5), and awards REP via the ledger for anything newly
 * true since then (A2) — all in one call, from the one place the card
 * is actually shown (/feed's own render), rather than scattering a
 * duplicate completion check across every action's own save route.
 */
export async function syncNewcomerPath(userId: string): Promise<NewcomerPathState> {
  const [user, profile, limitPracticeCount, newcomerMessageCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { avatarUrl: true, bio: true } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } }),
    prisma.userPractice.count({ where: { userId, kind: "limit" } }),
    prisma.message.count({ where: { userId, room: { slug: "newcomers" } } }),
  ]);

  const settingsRaw = (profile?.settings ?? {}) as Record<string, unknown>;
  const currentPathSettings = (settingsRaw.newcomerPath ?? {}) as NewcomerPathSettings;

  const completion = computeStepCompletion({
    hasAvatar: Boolean(user.avatarUrl),
    bioLength: user.bio?.length ?? 0,
    // Boundaries "saved at least once" — the mere presence of the
    // `boundaries` key (lib/dm/boundaries.ts#setBoundaries always
    // writes it, even when every value equals the default) is the
    // signal; reading it any other way would need a dedicated flag
    // this app's other settings-backed features don't have either.
    boundariesSaved: settingsRaw.boundaries !== undefined,
    hasLimitPractice: limitPracticeCount > 0,
    hasNewcomerMessage: newcomerMessageCount > 0,
  });

  const decision = decideNewcomerPathUpdate(currentPathSettings, completion);

  if (decision.newlyAwardedSteps.length > 0) {
    for (const step of decision.newlyAwardedSteps) {
      await awardRep({
        userId,
        reasonCode: STEP_REASON_CODE[step],
        sourceType: "newcomer_path",
        sourceId: userId,
        legacyReason: `Newcomer Path: ${step}`,
        legacySource: "newcomer_path",
      });
    }
  }

  const justCompleted = allStepsComplete(completion) && !currentPathSettings.completionAcknowledged;
  const finalSettings: NewcomerPathSettings = justCompleted
    ? { ...decision.updatedSettings, completionAcknowledged: true }
    : decision.updatedSettings;

  if (finalSettings !== currentPathSettings) {
    const updatedProfileSettings = { ...settingsRaw, newcomerPath: finalSettings } as Prisma.InputJsonValue;
    await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, settings: updatedProfileSettings },
      update: { settings: updatedProfileSettings },
    });
  }

  return { completion, settings: finalSettings, justCompleted };
}

export async function dismissNewcomerPath(userId: string, hours: number): Promise<void> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settingsRaw = (profile?.settings ?? {}) as Record<string, unknown>;
  const currentPathSettings = (settingsRaw.newcomerPath ?? {}) as NewcomerPathSettings;

  const updated: NewcomerPathSettings = {
    ...currentPathSettings,
    dismissedUntil: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
  };
  const updatedProfileSettings = { ...settingsRaw, newcomerPath: updated } as Prisma.InputJsonValue;

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, settings: updatedProfileSettings },
    update: { settings: updatedProfileSettings },
  });
}
