import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canAccessRoom } from "@/lib/rating/room-access";
import RoomChat from "@/components/shared/RoomChat";

export default async function RoomPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/rooms/${params.slug}`);

  const room = await prisma.room.findUnique({ where: { slug: params.slug } });
  if (!room || !room.isActive) notFound();

  if (!canAccessRoom(user, room)) {
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

  const messages = await prisma.message.findMany({
    where: { roomId: room.id, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      content: true,
      replyToId: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
    },
  });

  return (
    <RoomChat
      room={{ id: room.id, slug: room.slug, name: room.name, description: room.description }}
      currentUserId={user.id}
      initialMessages={messages.reverse().map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
    />
  );
}
