import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Veil (Phase B, B6, 2026-10-10, see DECISIONS.md) — a per-user boolean
// preference stored on the existing UserProfile.settings JSON field
// (defined in the schema since the Veil feature's own needs made it, but
// confirmed otherwise completely unused anywhere in the app — no
// migration needed for this). Read-merge-write throughout, per CLAUDE.md
// rule 9 (the 07.08.2026 ritualProgress incident) — copies the exact
// shape app/api/ritual/progress/route.ts already uses for the sibling
// `ritualProgress` field.
export async function getVeilEnabled(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  return settings.veil === true;
}

export async function setVeilEnabled(userId: string, veil: boolean): Promise<void> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const updated = { ...settings, veil } as Prisma.InputJsonValue;

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, settings: updated },
    update: { settings: updated },
  });
}
