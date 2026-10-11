import "server-only";
import { prisma } from "@/lib/db/prisma";

// dm.request_* notifications already have their own home and their own
// unread signal on /messages (app/(platform)/hall/page.tsx excludes
// them from its own notification display for the same reason — see
// that file's comment). Excluded here too, so the same event doesn't
// light up both the Messages badge and this one.
const EXCLUDED_TYPES = ["dm.request_received", "dm.request_accepted", "dm.request_declined"];

// Navigation v2 (Phase B, 2026-10-10, see DECISIONS.md) — the top bar's
// new notifications bell. `Notification.isRead` already exists and is
// written to, but nothing in the nav surfaced an unread count before
// this; this is the first reader.
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false, type: { notIn: EXCLUDED_TYPES } } });
}
