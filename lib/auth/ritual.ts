import type { User, UserProfile } from "@prisma/client";

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
 * profile") is derived live from User fields, never stored, so there's
 * no drift between what's displayed and what's actually true. Steps
 * 2/3/4/5 start "deferred" at account creation (see ADR-0013) until real
 * content/features exist to back them for real.
 */
export function getRitualStatus(user: User, profile: UserProfile | null): RitualStatus {
  const profileComplete = Boolean(user.bio && user.avatarUrl);
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;

  const asStatus = (value: unknown): RitualStepStatus =>
    value === true ? "done" : value === "deferred" ? "deferred" : "todo";

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
      status: asStatus(progress.newcomerRoom),
      note: "Rooms haven't opened yet.",
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
