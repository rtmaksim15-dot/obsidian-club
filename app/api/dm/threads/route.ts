import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveAvatarUrl } from "@/lib/storage/resolve-media";

// GET /api/dm/threads — the current user's active conversations (an
// active ThreadParticipant row, leftAt null), newest-activity first,
// each with the other participant and a preview of the last message.
// Left threads are excluded entirely — same "full exit" as the
// message routes.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const participations = await prisma.threadParticipant.findMany({
    where: { userId: user.id, leftAt: null },
    select: {
      thread: {
        select: {
          id: true,
          participantAId: true,
          participantBId: true,
          participantA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          participantB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, isDeleted: true, createdAt: true, senderId: true },
          },
        },
      },
    },
  });

  const threads = (
    await Promise.all(
      participations.map(async ({ thread }) => {
        const other = thread.participantAId === user.id ? thread.participantB : thread.participantA;
        const last = thread.messages[0] ?? null;
        return {
          id: thread.id,
          otherParticipant: { ...other, avatarUrl: await resolveAvatarUrl(other.avatarUrl) },
          lastMessage: last
            ? {
                content: last.isDeleted ? "" : last.content,
                isDeleted: last.isDeleted,
                createdAt: last.createdAt.toISOString(),
                fromMe: last.senderId === user.id,
              }
            : null,
        };
      }),
    )
  )
    .sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? "";
      const bt = b.lastMessage?.createdAt ?? "";
      return bt.localeCompare(at);
    });

  return NextResponse.json({ threads });
}
