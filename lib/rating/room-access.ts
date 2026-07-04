import type { Room, User } from "@prisma/client";

const NEWCOMER_WINDOW_DAYS = 30;

/**
 * Whether a member can access a room. Beyond the simple `minLevel` gate,
 * the newcomers' room is time-windowed — PRODUCT.md §1: "Level I, first
 * 30 days" — not just a level check.
 */
export function canAccessRoom(user: User, room: Room): boolean {
  if (user.level < room.minLevel) return false;

  if (room.type === "newcomers") {
    if (!user.joinedAt) return false;
    const daysSinceJoin = (Date.now() - user.joinedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceJoin <= NEWCOMER_WINDOW_DAYS;
  }

  return true;
}
