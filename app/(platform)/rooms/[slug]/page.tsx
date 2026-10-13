import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessRoom } from "@/lib/rating/room-access";
import RoomChat from "@/components/shared/RoomChat";
import ChatShell from "@/components/shared/ChatShell";
import PinnedNote from "@/components/shared/PinnedNote";
import { resolveAvatarUrls } from "@/lib/storage/resolve-media";
import { getTestAccountUserIds } from "@/lib/moderation/test-accounts";

export default async function RoomPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/rooms/${params.slug}`);

  const room = await prisma.room.findUnique({ where: { slug: params.slug } });
  if (!room || !room.isActive) notFound();

  if (!(await canAccessRoom(user, room))) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ob-black px-6 text-center text-ob-text">
        <p className="text-label mb-3">Locked</p>
        <h1 className="text-h1">{room.name}</h1>
        <p className="text-body mt-4 max-w-sm">
          {room.type === "newcomers"
            ? "This room is only open during a member's first 30 days."
            : `Level ${room.minLevel} or higher is required.`}
        </p>
      </main>
    );
  }

  // Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
  // a non-admin never sees a test account's messages at all.
  const testAccountIds = user.isAdmin ? [] : await getTestAccountUserIds();

  // Moderation gap 1 (2026-09-08, see DECISIONS.md): removed messages
  // stay as tombstones — see GET /api/rooms/:slug/messages's comment.
  const rawMessages = await prisma.message.findMany({
    where: { roomId: room.id, userId: { notIn: testAccountIds } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      isDeleted: true,
      replyToId: true,
      createdAt: true,
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true, isTest: true } },
    },
  });
  const redacted = rawMessages.map((m) => (m.isDeleted ? { ...m, content: "" } : m));
  const avatarUrls = await resolveAvatarUrls(redacted.map((m) => m.user.avatarUrl));
  const messages = redacted.map((m, i) => ({ ...m, user: { ...m.user, avatarUrl: avatarUrls[i] } }));

  // Clean Hall, B5 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
  // with only one active room, /rooms itself redirects straight back
  // here (app/(platform)/rooms/page.tsx's own `rooms.length === 1`
  // check), so a link to it would go nowhere new; hidden in that case.
  // With more than one, it becomes the way back to the room list —
  // replacing the old "Members →" link to /members (still reachable
  // from MessagesInbox.tsx's own "Find members" link).
  const activeRoomCount = await prisma.room.count({ where: { isActive: true } });

  return (
    // Desktop room layout (2026-09-24, see DECISIONS.md): the DM thread's
    // full-height fix (2026-09-22) was applied only there, leaving Room
    // chat's old `min-h-screen` main growing taller than the viewport —
    // the composer sat below the fold and scrolling to reach it clipped
    // this very header. Now shares ChatShell with the DM thread so the
    // two layouts can't drift apart again.
    <ChatShell
      header={
        <header className="shrink-0 border-b border-ob-border px-6 py-6">
          {activeRoomCount > 1 ? (
            <a href="/rooms" className="text-caption mb-2 inline-block text-ob-accent">
              All rooms →
            </a>
          ) : null}
          <p className="text-h1 !text-xl">{room.name}</p>
          {room.description ? <p className="text-caption mt-1">{room.description}</p> : null}
        </header>
      }
    >
      <PinnedNote roomId={room.id} initialNote={room.pinnedNote} isAdmin={user.isAdmin} />
      <RoomChat
        room={{ id: room.id, slug: room.slug }}
        currentUserId={user.id}
        currentUserIsAdmin={user.isAdmin}
        initialMessages={messages.reverse().map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </ChatShell>
  );
}
