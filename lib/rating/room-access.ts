import type { Room, User } from "@prisma/client";
import { isRitualComplete } from "@/lib/auth/ritual";
import { isAppOpen, getAppOpenedAt } from "@/lib/config/app-open";
import { getDoorsState } from "@/lib/config/doors";

const NEWCOMER_WINDOW_DAYS = 30;
const DAY_MS = 1000 * 60 * 60 * 24;

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
 *
 * Normal-operation mode (item 2, 2026-09-21, see DECISIONS.md): the
 * 30 days count from the LATER of `joinedAt` and "the moment the app
 * opened for them" — a member invited before that moment must not find
 * their window already half (or fully) spent the first time they can
 * actually use it. That moment is getAppOpenedAt() while APP_OPEN=true,
 * else DOORS_OPEN_DATE (the pre-existing, only-ever-had-one launch
 * gate). Separately, while APP_OPEN=true and "now" is still before
 * DOORS_OPEN_DATE (or DOORS_OPEN_DATE is unset) — the manually-invited
 * soft-launch phase, before the real announced date — Newcomers is open
 * to every member outright, floor math aside: a small, hand-picked
 * early cohort shouldn't be able to lock each other out of the one room
 * that's also how the ritual gets finished.
 *
 * Founder exception (2026-09-10, production decision): isAdmin accounts
 * bypass every check here, including `minLevel` — Lord Obsidian doesn't
 * pass through initiation or leveling, he's already inside every room.
 */
export async function canAccessRoom(user: User, room: Room): Promise<boolean> {
  if (user.isAdmin) return true;
  if (user.level < room.minLevel) return false;

  if (room.type === "newcomers") {
    const appOpen = isAppOpen();
    const doorsDate = getDoorsState().date;

    if (appOpen && (!doorsDate || Date.now() < doorsDate.getTime())) {
      return true;
    }

    if (!user.joinedAt) return false;
    const floor = appOpen ? await getAppOpenedAt() : doorsDate;
    const windowStart = floor && floor.getTime() > user.joinedAt.getTime() ? floor : user.joinedAt;
    const daysSinceStart = (Date.now() - windowStart.getTime()) / DAY_MS;
    if (daysSinceStart <= NEWCOMER_WINDOW_DAYS) return true;
    return !(await isRitualComplete(user));
  }

  return true;
}
