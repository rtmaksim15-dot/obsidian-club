import type { Room, User } from "@prisma/client";
import { isRitualComplete } from "@/lib/auth/ritual";

const NEWCOMER_WINDOW_DAYS = 30;

/**
 * Whether a member can access a room. Beyond the simple `minLevel` gate,
 * the newcomers' room is time-windowed — PRODUCT.md §1: "Level I, first
 * 30 days." Exception (2026-09-10, see DECISIONS.md): that room is also
 * the only way to satisfy the ritual's "introduce yourself" step, so a
 * member whose ritual is still incomplete once the window closes keeps
 * access rather than being permanently locked out of ever finishing it.
 * Access reverts to the plain 30-day rule as soon as the ritual
 * completes. The ritual check only runs once the window has actually
 * closed, so the common case stays a single date comparison.
 */
export async function canAccessRoom(user: User, room: Room): Promise<boolean> {
  if (user.level < room.minLevel) return false;

  if (room.type === "newcomers") {
    if (!user.joinedAt) return false;
    const daysSinceJoin = (Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceJoin <= NEWCOMER_WINDOW_DAYS) return true;
    return !(await isRitualComplete(user));
  }

  return true;
}
