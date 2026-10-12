import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getUnreadDmCount } from "@/lib/dm/unread";
import { getUnreadNotificationCount } from "@/lib/notifications/unread";
import { getVeilEnabled } from "@/lib/profile/veil";
import { resolveAvatarUrl } from "@/lib/storage/resolve-media";

export type MemberShellData = {
  avatarUrl: string | null;
  unreadDmCount: number;
  unreadNotificationCount: number;
  title: string | null;
  inviteAllowance: number;
  hasOutstandingMemberInvite: boolean;
  veilEnabled: boolean;
};

// Extracted from app/(platform)/layout.tsx verbatim (PWA hardening,
// Package 3, 2026-10-11, see DECISIONS.md) so app/(legal)/layout.tsx
// can build the same TopBar/MineMenu props for a fullAccess visitor
// without duplicating this Promise.all. Only called once fullAccess is
// already known true — same precondition as before this was pulled out.
export async function getMemberShellData(user: User): Promise<MemberShellData> {
  const [avatarUrl, unreadDmCount, unreadNotificationCount, profile, memberInviteTokens, veilEnabled] =
    await Promise.all([
      resolveAvatarUrl(user.avatarUrl),
      getUnreadDmCount(user.id),
      getUnreadNotificationCount(user.id),
      prisma.userProfile.findUnique({ where: { userId: user.id }, select: { title: true } }),
      prisma.inviteToken.findMany({ where: { source: "member", inviterId: user.id }, select: { redeemedAt: true } }),
      getVeilEnabled(user.id),
    ]);

  return {
    avatarUrl,
    unreadDmCount,
    unreadNotificationCount,
    title: profile?.title ?? null,
    inviteAllowance: user.inviteAllowance,
    hasOutstandingMemberInvite: memberInviteTokens.some((t) => !t.redeemedAt),
    veilEnabled,
  };
}
