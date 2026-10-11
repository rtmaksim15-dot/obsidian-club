import "server-only";
import { prisma } from "@/lib/db/prisma";
import { effectiveRequestStatus } from "@/lib/dm/lifecycle";

// Messages nav unread indicator (item 3, 2026-09-18, see DECISIONS.md).
// Two independent signals, either one lights the badge: a pending
// conversation request waiting on this user, or a thread whose latest
// message is newer than this participant's own lastReadAt (never-opened
// counts as unread too, since lastReadAt starts null).
export async function hasUnreadDm(userId: string): Promise<boolean> {
  const [pendingRequests, participations] = await Promise.all([
    prisma.conversationRequest.findMany({
      where: { recipientId: userId, status: "pending" },
      select: { status: true, createdAt: true },
    }),
    prisma.threadParticipant.findMany({
      where: { userId, leftAt: null },
      select: {
        lastReadAt: true,
        thread: {
          select: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true, senderId: true },
            },
          },
        },
      },
    }),
  ]);

  if (pendingRequests.some((r) => effectiveRequestStatus(r) === "pending")) return true;

  return participations.some(({ lastReadAt, thread }) => {
    const last = thread.messages[0];
    if (!last || last.senderId === userId) return false;
    return !lastReadAt || last.createdAt > lastReadAt;
  });
}

// Navigation v2 (Phase B, 2026-10-10, see DECISIONS.md) — the new top
// bar's Messages badge needs an actual count (none at 0, the number
// 1-9, "9+" above), not just the boolean hasUnreadDm() above already
// answers. Same two signals, counted instead of just detected.
export async function getUnreadDmCount(userId: string): Promise<number> {
  const [pendingRequests, participations] = await Promise.all([
    prisma.conversationRequest.findMany({
      where: { recipientId: userId, status: "pending" },
      select: { status: true, createdAt: true },
    }),
    prisma.threadParticipant.findMany({
      where: { userId, leftAt: null },
      select: {
        lastReadAt: true,
        thread: {
          select: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true, senderId: true },
            },
          },
        },
      },
    }),
  ]);

  const pendingCount = pendingRequests.filter((r) => effectiveRequestStatus(r) === "pending").length;
  const unreadThreadCount = participations.filter(({ lastReadAt, thread }) => {
    const last = thread.messages[0];
    if (!last || last.senderId === userId) return false;
    return !lastReadAt || last.createdAt > lastReadAt;
  }).length;

  return pendingCount + unreadThreadCount;
}
