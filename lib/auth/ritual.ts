import type { User, UserProfile } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { awardRep, REP_TABLE } from "@/lib/rating/rep-engine";

export type RitualStepStatus = "done" | "deferred" | "todo";

export type RitualStatus = {
  complete: boolean;
  steps: {
    id: string;
    label: string;
    status: RitualStepStatus;
    note?: string;
  }[];
};

/**
 * Computes Initiation Ritual status (PRODUCT.md §1 Stage 2) from real
 * data — nothing here is a self-reported checkbox. Step 1 ("complete
 * profile") is derived live from User fields. Step 4 ("newcomers' room")
 * is now real too (`v0.5`), checked live against actual message history,
 * now that Rooms exist (`v0.4`) — ADR-0013 flagged this as the exact
 * trigger to revisit once Rooms shipped. Steps 2/3/5 still start
 * "deferred" — they need Code of Conduct / Lord Obsidian's intro /
 * safety-rules content Max hasn't written yet, a content gap `v0.5`'s
 * rating work didn't touch.
 */
export async function getRitualStatus(user: User, profile: UserProfile | null): Promise<RitualStatus> {
  const profileComplete = Boolean(user.bio && user.avatarUrl);
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;

  const asStatus = (value: unknown): RitualStepStatus =>
    value === true ? "done" : value === "deferred" ? "deferred" : "todo";

  const introducedInNewcomerRoom =
    (await prisma.message.count({
      where: { userId: user.id, room: { slug: "newcomers" } },
    })) > 0;

  // CLAUDE.md (2026-07-05): "First community introduction" — +100 REP,
  // one-time. Tracked via a RepHistory row (source key) rather than a
  // new schema flag, same idempotency pattern as checkProfileCompleteBonus.
  if (introducedInNewcomerRoom) {
    const alreadyGranted = await prisma.repHistory.findFirst({
      where: { userId: user.id, source: "first-community-intro" },
    });
    if (!alreadyGranted) {
      await awardRep(
        user.id,
        REP_TABLE.earn.firstCommunityIntro.points,
        "First community introduction",
        "first-community-intro",
      );
    }
  }

  const steps: RitualStatus["steps"] = [
    {
      id: "profile",
      label: "Complete your profile",
      status: profileComplete ? "done" : "todo",
      note: profileComplete ? undefined : "Add a bio and avatar to your profile.",
    },
    {
      id: "codeOfConduct",
      label: "Read and accept the Code of Conduct",
      status: asStatus(progress.codeOfConduct),
      note: "Content pending.",
    },
    {
      id: "introMaterial",
      label: "Lord Obsidian's introduction",
      status: asStatus(progress.introMaterial),
      note: "Content pending.",
    },
    {
      id: "newcomerRoom",
      label: "Introduce yourself in the newcomers' room",
      status: introducedInNewcomerRoom ? "done" : "todo",
      note: introducedInNewcomerRoom ? undefined : "Post at least one message in the Newcomers room.",
    },
    {
      id: "safetyRules",
      label: "Confirm the safety & respect guidelines",
      status: asStatus(progress.safetyRules),
      note: "Content pending.",
    },
  ];

  const complete = steps.every((s) => s.status === "done" || s.status === "deferred");

  return { complete, steps };
}
