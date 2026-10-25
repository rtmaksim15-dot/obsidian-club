import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — a per-user
// preference object stored on the existing UserProfile.settings JSON
// field, same read-merge-write shape as lib/profile/veil.ts#setVeilEnabled
// (CLAUDE.md rule 9 — the 07.08.2026 ritualProgress incident). Default
// is "discreet on, every category on" per the task's own spec — a
// brand-new member who never visits /settings/notifications still gets
// the quiet, name-free version of every category once they do enable
// push on a device, never the loud one by accident.
export type NotificationPreferences = {
  discreet: boolean;
  messages: boolean;
  replies: boolean;
  lordWord: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  discreet: true,
  messages: true,
  replies: true,
  lordWord: true,
};

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const stored = (settings.notifications ?? {}) as Partial<NotificationPreferences>;
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...stored };
}

export async function setNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } });
  const settings = (profile?.settings ?? {}) as Record<string, unknown>;
  const current = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...((settings.notifications ?? {}) as Partial<NotificationPreferences>) };
  const updatedPrefs = { ...current, ...patch };
  const updatedSettings = { ...settings, notifications: updatedPrefs } as Prisma.InputJsonValue;

  await prisma.userProfile.upsert({
    where: { userId },
    create: { userId, settings: updatedSettings },
    update: { settings: updatedSettings },
  });

  return updatedPrefs;
}
