import "server-only";
import { prisma } from "@/lib/db/prisma";

// Normal-operation mode (2026-09-21, see DECISIONS.md) — a manual,
// invitation-only "as if launched" state for every signed-in member,
// independent of the public landing page's countdown/DOORS_OPEN_DATE
// (which stays exactly as-is; see lib/config/doors.ts). Read fresh on
// every call, same runtime-env-var posture as DOORS_OPEN_DATE — no
// redeploy needed to flip it.
export function isAppOpen(): boolean {
  return process.env.APP_OPEN === "true";
}

/**
 * The moment APP_OPEN was first observed true — the floor for the
 * Newcomers-room window (lib/rating/room-access.ts), so a member
 * invited before the app opened doesn't lose days they could never
 * have used it. Env vars carry no timestamp of their own, so this is
 * recorded in the database, in a single permanent row, the first time
 * any request needs it — every call after that just reads the same
 * value back. Only ever called while isAppOpen() is true; the caller
 * decides the DOORS_OPEN_DATE fallback for when it's false.
 */
export async function getAppOpenedAt(): Promise<Date> {
  const state = await prisma.appState.upsert({
    where: { id: 1 },
    create: { id: 1, appOpenedAt: new Date() },
    update: {},
  });
  return state.appOpenedAt!;
}
