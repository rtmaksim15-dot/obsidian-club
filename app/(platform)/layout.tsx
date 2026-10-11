import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { needsLegalReconsent } from "@/lib/legal/reconsent";
import { needsAgeVerification } from "@/lib/age-verification/gate";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { getUnreadDmCount } from "@/lib/dm/unread";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";
import { getVeilEnabled } from "@/lib/profile/veil";
import { resolveAvatarUrl } from "@/lib/storage/resolve-media";
import TopBar from "@/components/shared/TopBar";
import BottomTabBar from "@/components/shared/BottomTabBar";
import PlatformShell from "@/components/shared/PlatformShell";

// Legal re-consent gate (Block 4, 2026-08-10) — applied once here
// rather than duplicated per-page (unlike the smaller, deliberately
// page-by-page Doors/ritual gates — see DECISIONS.md) because this
// needs to cover every one of middleware.ts's ~17 protected prefixes,
// and this layout already wraps all of them. /legal-reconsent itself
// lives outside `(platform)` (in `(auth)`) specifically so it isn't
// wrapped by this same check — redirecting to a page this layout also
// gates would loop.
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (user && (await needsLegalReconsent(user.id))) {
    redirect("/legal-reconsent");
  }

  // 21+ Age Verification Gate, Phase A (2026-10-10, see DECISIONS.md) —
  // same centralized shape as the legal-reconsent check right above it
  // (covers every one of middleware.ts's protected prefixes from one
  // place), checked before the ritual/Doors gates below since the task
  // explicitly wants this "before the ritual." /verify and
  // /verify/return live outside `(platform)` (in `(auth)`, next to
  // /legal-reconsent) for the same loop-avoidance reason.
  if (user && needsAgeVerification(user)) {
    redirect("/verify");
  }

  // Desktop nav gap (2026-09-12) — DesktopNav's five destinations are
  // exactly the pages the ritual gate (feed/compose/members/hall) and
  // the doors gate (same four) bounce a non-admin member back from
  // while incomplete/waiting. `fullAccess` mirrors those pages' own gate
  // logic so the bar only ever appears once it can't dead-end: admins
  // always pass (same founder exception as those pages), everyone else
  // needs both ritual.complete and doors open. Mid-ritual and
  // antechamber members keep their existing sign-out (ritual/layout.tsx,
  // antechamber/page.tsx) instead of a second one from this bar.
  //
  // Launch preview (2026-09-18, see DECISIONS.md): a PREVIEW_USER_IDS
  // account is not an admin exception — it still has to finish the
  // ritual like a real member — it only skips the doors half of the
  // check, via the same bypassesDoors() every gated page now uses.
  let fullAccess = false;
  if (user) {
    fullAccess = user.isAdmin || ((await isRitualComplete(user)) && (bypassesDoors(user) || !getDoorsState().active));
  }

  // Navigation v2 (Phase B, 2026-10-10, see DECISIONS.md) — TopBar and
  // BottomTabBar replace DesktopNav/BottomNav entirely, on EVERY
  // breakpoint (not a mobile/desktop fork like the nav they replace —
  // see DECISIONS.md for why this session chose one universal shell).
  // Gated on `fullAccess` for both, tightening BottomNav's old "any
  // logged-in user" gate: a mid-ritual/antechamber member already has
  // their own persistent sign-out on those pages (ritual/layout.tsx,
  // antechamber/page.tsx) and showing them "Invitations: you hold N"
  // or a Veil toggle before they're actually inside doesn't make sense.
  let navData: {
    avatarUrl: string | null;
    unreadDmCount: number;
    unreadNotificationCount: number;
    title: string | null;
    inviteAllowance: number;
    hasOutstandingMemberInvite: boolean;
    veilEnabled: boolean;
  } | null = null;

  if (fullAccess) {
    const [avatarUrl, unreadDmCount, unreadNotificationCount, profile, memberInviteTokens, veilEnabled] =
      await Promise.all([
        resolveAvatarUrl(user!.avatarUrl),
        getUnreadDmCount(user!.id),
        getUnreadNotificationCount(user!.id),
        prisma.userProfile.findUnique({ where: { userId: user!.id }, select: { title: true } }),
        prisma.inviteToken.findMany({ where: { source: "member", inviterId: user!.id }, select: { redeemedAt: true } }),
        getVeilEnabled(user!.id),
      ]);

    navData = {
      avatarUrl,
      unreadDmCount,
      unreadNotificationCount,
      title: profile?.title ?? null,
      inviteAllowance: user!.inviteAllowance,
      hasOutstandingMemberInvite: memberInviteTokens.some((t) => !t.redeemedAt),
      veilEnabled,
    };
  }

  return (
    <>
      <PlatformShell fullAccess={fullAccess}>{children}</PlatformShell>
      {fullAccess && navData ? (
        <>
          <TopBar
            avatarUrl={navData.avatarUrl}
            displayName={user!.displayName}
            unreadDmCount={navData.unreadDmCount}
            unreadNotificationCount={navData.unreadNotificationCount}
            worldDrawerProps={{}}
            mineMenuProps={{
              displayName: user!.displayName,
              avatarUrl: navData.avatarUrl,
              username: user!.username,
              title: navData.title,
              inviteAllowance: navData.inviteAllowance,
              hasOutstandingMemberInvite: navData.hasOutstandingMemberInvite,
              initialVeilEnabled: navData.veilEnabled,
            }}
          />
          <BottomTabBar />
        </>
      ) : null}
    </>
  );
}
