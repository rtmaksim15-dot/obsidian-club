import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessRoom } from "@/lib/rating/room-access";
import RoomChat from "@/components/shared/RoomChat";
import ChatShell from "@/components/shared/ChatShell";
import { resolveAvatarUrls } from "@/lib/storage/resolve-media";

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

  // Moderation gap 1 (2026-09-08, see DECISIONS.md): removed messages
  // stay as tombstones — see GET /api/rooms/:slug/messages's comment.
  const rawMessages = await prisma.message.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      isDeleted: true,
      replyToId: true,
      createdAt: true,
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
    },
  });
  const redacted = rawMessages.map((m) => (m.isDeleted ? { ...m, content: "" } : m));
  const avatarUrls = await resolveAvatarUrls(redacted.map((m) => m.user.avatarUrl));
  const messages = redacted.map((m, i) => ({ ...m, user: { ...m.user, avatarUrl: avatarUrls[i] } }));

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
          <a href="/members" className="text-caption mb-2 inline-block text-ob-accent">
            Members →
          </a>
          <p className="text-h1 !text-xl">{room.name}</p>
          {room.description ? <p className="text-caption mt-1">{room.description}</p> : null}
        </header>
      }
    >
      <RoomChat
        room={{ id: room.id, slug: room.slug }}
        currentUserId={user.id}
        initialMessages={messages.reverse().map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
      />
    </ChatShell>
  );
}
