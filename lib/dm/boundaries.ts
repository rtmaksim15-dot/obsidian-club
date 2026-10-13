import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  parseBoundaries,
  evaluateBoundaries,
  DEFAULT_BOUNDARIES,
  type BoundariesSettings,
  type BoundariesVerdict,
  type WhoCanMessage,
} from "./boundaries-core";

export { DEFAULT_BOUNDARIES, evaluateBoundaries };
export type { BoundariesSettings, BoundariesVerdict, WhoCanMessage };

// My Boundaries (Package 4, Phase A, 2026-10-13, see DECISIONS.md) — a
// per-user preference object stored on the existing UserProfile.settings
// JSON field, nested under the "boundaries" key so it coexists with
// Veil (lib/profile/veil.ts's top-level "veil" key) without colliding.
// Read-merge-write throughout, per CLAUDE.md rule 9 — same pattern as
// veil.ts, itself copying app/api/ritual/progress/route.ts's shape.
// The actual decision matrix lives in boundaries-core.ts (pure, no
// "server-only"/Prisma) so it's unit-testable; this file is the
// DB-touching wrapper around it.

export async function getBoundaries(userId: string): Promise<BoundariesSettings> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  return parseBoundaries(settings.boundaries);
}

export async function setBoundaries(userId: string, patch: Partial<BoundariesSettings>): Promise<BoundariesSettings> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const current = parseBoundaries(settings.boundaries);
  const updatedBoundaries: BoundariesSettings = { ...current, ...patch };
  const updatedSettings = { ...settings, boundaries: updatedBoundaries } as Prisma.InputJsonValue;

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, settings: updatedSettings },
    update: { settings: updatedSettings },
  });

  return updatedBoundaries;
}

// Derived from prisma.$transaction's own callback param type (rather
// than the generated Prisma.TransactionClient directly), matching
// lib/dm/eligibility.ts's own `Client` type — needed so this can be
// called from inside that module's transaction-wrapped race-check too.
type Client = typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Whether `senderId` may send `recipientId` a brand new conversation
 * request right now, per the recipient's own Boundaries settings.
 * Called from lib/dm/eligibility.ts#getRequestEligibility (enforcement)
 * and lib/dm/relationship.ts#getMessageButtonState (the profile Message
 * button's own state) — one source of truth for both.
 */
export async function getBoundariesVerdict(
  recipientId: string,
  senderId: string,
  client: Client = prisma,
): Promise<BoundariesVerdict> {
  const profile = await client.userProfile.findUnique({ where: { userId: recipientId }, select: { settings: true } });
  const settings = parseBoundaries(((profile?.settings ?? {}) as Record<string, unknown>).boundaries);

  const isFollowedByRecipient =
    settings.whoCanMessage === "following"
      ? (await client.follow.findUnique({
          where: { followerId_followingId: { followerId: recipientId, followingId: senderId } },
          select: { followerId: true },
        })) !== null
      : false;

  return evaluateBoundaries(settings, isFollowedByRecipient);
}
