import "server-only";
import type { Prisma, UserPracticeKind } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  canViewPractices,
  DEFAULT_PRACTICES_VISIBILITY,
  PRACTICES_VISIBILITY_VALUES,
  type PracticesVisibility,
} from "./practices-core";

export { canViewPractices, DEFAULT_PRACTICES_VISIBILITY, PRACTICES_VISIBILITY_VALUES };
export type { PracticesVisibility };

// Profile lite, B2 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// Visibility is a per-member setting on UserProfile.settings
// (read-merge-write, CLAUDE.md rule 9 — same pattern as Veil/
// Boundaries), not per-row on UserPractice.

export async function getPracticesVisibility(userId: string): Promise<PracticesVisibility> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const value = settings.practicesVisibility;
  return PRACTICES_VISIBILITY_VALUES.includes(value as PracticesVisibility)
    ? (value as PracticesVisibility)
    : DEFAULT_PRACTICES_VISIBILITY;
}

export async function setPracticesVisibility(userId: string, visibility: PracticesVisibility): Promise<void> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const updated = { ...settings, practicesVisibility: visibility } as Prisma.InputJsonValue;
  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, settings: updated },
    update: { settings: updated },
  });
}

export type PracticeTagOption = { id: string; slug: string; label: string };
export type GroupedPractices = Record<UserPracticeKind, PracticeTagOption[]>;

/** The full, active, curated tag list, in display order — never free text. */
export async function getActivePracticeTags(): Promise<PracticeTagOption[]> {
  return prisma.practiceTag.findMany({
    where: { active: true },
    orderBy: { sort: "asc" },
    select: { id: true, slug: true, label: true },
  });
}

/** One member's own selections, grouped by kind — includes tags later marked inactive, since removing a tag from new selection shouldn't erase a member's existing history. */
export async function getUserPractices(userId: string): Promise<GroupedPractices> {
  const rows = await prisma.userPractice.findMany({
    where: { userId },
    include: { tag: { select: { id: true, slug: true, label: true } } },
    orderBy: { tag: { sort: "asc" } },
  });
  const grouped: GroupedPractices = { limit: [], practice: [], curious: [] };
  for (const row of rows) {
    grouped[row.kind].push(row.tag);
  }
  return grouped;
}

/** Sets (or clears, with kind: null) one tag's kind for a member. */
export async function setUserPractice(userId: string, tagId: string, kind: UserPracticeKind | null): Promise<void> {
  if (kind === null) {
    await prisma.userPractice.deleteMany({ where: { userId, tagId } });
    return;
  }
  await prisma.userPractice.upsert({
    where: { userId_tagId: { userId, tagId } },
    create: { userId, tagId, kind },
    update: { kind },
  });
}

/** Whether `viewerId` (null for an anonymous visitor) may see `ownerId`'s practices right now. */
export async function canViewPracticesFor(viewerId: string | null, ownerId: string): Promise<boolean> {
  const isOwner = viewerId === ownerId;
  if (isOwner) return true;
  if (!viewerId) return false;

  const visibility = await getPracticesVisibility(ownerId);
  const isFollowedByOwner =
    visibility === "following"
      ? (await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: ownerId, followingId: viewerId } },
          select: { followerId: true },
        })) !== null
      : false;

  return canViewPractices(visibility, isOwner, isFollowedByOwner);
}
