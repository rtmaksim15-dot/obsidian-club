import type { User } from "@prisma/client";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";

// Extracted from app/(platform)/layout.tsx verbatim (PWA hardening,
// Package 3, 2026-10-11, see DECISIONS.md) so app/(legal)/layout.tsx
// can gate its own member-shell chrome on the exact same definition —
// same rule as PlatformShell/TopBar/BottomTabBar already use: admins
// always pass (same founder exception as feed/compose/members/hall),
// everyone else needs both ritual.complete and doors open.
export async function computeFullAccess(user: User): Promise<boolean> {
  if (user.isAdmin) return true;
  return (await isRitualComplete(user)) && (bypassesDoors(user) || !getDoorsState().active);
}
