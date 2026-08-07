import type { User, UserProfile } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { awardRep, REP_TABLE } from "@/lib/rating/rep-engine";

export type RitualStepStatus = "done" | "todo";

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
 * is real too (`v0.5`), checked live against actual message history, now
 * that Rooms exist (`v0.4`) — ADR-0013 flagged this as the exact trigger
 * to revisit once Rooms shipped. Steps 2/3/5 (Code of Conduct, Lord
 * Obsidian's introduction, Safety & Respect Guidelines) are all real now
 * — `safetyRules` got its content 2026-08-03, the last of the three to
 * drop the "deferred" sentinel (Code of Conduct/introMaterial did so
 * 2026-07-15). Anyone whose `ritualProgress` predates this change
 * (stored `"deferred"` from `INITIAL_RITUAL_PROGRESS`) is correctly
 * re-surfaced as `"todo"` — they never actually read/accepted anything,
 * since the content didn't exist. Set via `POST /api/ritual/progress`
 * from `/ritual/code-of-conduct`, `/ritual/introduction`, and
 * `/ritual/safety-rules`.
 *
 * Step 1 ("profile") now also requires `progress.usernameChosen`
 * (Username-in-the-Ritual, 2026-08-06) — set by `PATCH /api/profile`
 * the first time a member's username actually changes (their ritual-time
 * pick counts as that change; see that route). Every member who existed
 * before this shipped was backfilled with `usernameChosen: true`
 * directly in the database (not through this code path) specifically so
 * this new requirement can't retroactively re-open an already-complete
 * ritual for a real, currently-active member — see DECISIONS.md.
 */
export async function getRitualStatus(user: User, profile: UserProfile | null): Promise<RitualStatus> {
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;
  const usernameChosen = progress.usernameChosen === true;
  const profileComplete = Boolean(user.bio && user.avatarUrl && usernameChosen);

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

  let profileNote: string | undefined;
  if (!profileComplete) {
    const needsBioOrAvatar = !user.bio || !user.avatarUrl;
    if (needsBioOrAvatar && !usernameChosen) {
      profileNote = "Add a bio and avatar, and choose your name in the Circle.";
    } else if (!usernameChosen) {
      profileNote = "Choose your name in the Circle.";
    } else {
      profileNote = "Add a bio and avatar to your profile.";
    }
  }

  const steps: RitualStatus["steps"] = [
    {
      id: "profile",
      label: "Complete your profile",
      status: profileComplete ? "done" : "todo",
      note: profileNote,
    },
    {
      id: "codeOfConduct",
      label: "Read and accept the Code of Conduct",
      status: progress.codeOfConduct === true ? "done" : "todo",
      note: progress.codeOfConduct === true ? undefined : "Five laws. No exceptions.",
    },
    {
      id: "introMaterial",
      label: "Lord Obsidian's introduction",
      status: progress.introMaterial === true ? "done" : "todo",
      note: progress.introMaterial === true ? undefined : "A word from the founder before you enter.",
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
      status: progress.safetyRules === true ? "done" : "todo",
      note: progress.safetyRules === true ? undefined : "What protects you — and what will remove you.",
    },
  ];

  const complete = steps.every((s) => s.status === "done");

  return { complete, steps };
}
