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
