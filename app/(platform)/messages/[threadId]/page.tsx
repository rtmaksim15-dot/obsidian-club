import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { isBlockedEitherWay } from "@/lib/moderation/block";
import { needsDmRulesAcceptance } from "@/lib/legal/dm-rules";
import DmThreadChat from "@/components/shared/DmThreadChat";
import LeaveThreadButton from "@/components/shared/LeaveThreadButton";
import ContentMenu from "@/components/shared/ContentMenu";

// /messages/:threadId (2026-09-14, see DECISIONS.md). Same 404-for-
// everything shape as the API routes: doesn't exist, isn't yours, or
// you left it all look identical from outside. Item 6 — leave, block,
// report — lives in the header; report is also available per-message,
// inside DmThreadChat, matching the existing Room-chat pattern.
export default async function ThreadPage({ params }: { params: { threadId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/messages/${params.threadId}`);

  // Ritual and Doors are checked separately (2026-09-18, launch preview,
  // see DECISIONS.md) — see messages/page.tsx.
  if (!user.isAdmin) {
    if (!(await isRitualComplete(user))) redirect("/ritual");
  }
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  // Item 4 — a direct link to a thread (e.g. a notification) shouldn't
  // bypass the gate on /messages itself.
  if (await needsDmRulesAcceptance(user.id)) redirect("/messages");

  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId: params.threadId, userId: user.id } },
  });
  if (!participant || participant.leftAt) notFound();

  // Opening the thread clears its unread state (lib/dm/unread.ts) — a
  // fire-and-forget write, same pattern as track()'s analytics calls,
  // since it only affects a nav badge and shouldn't block the page.
  prisma.threadParticipant
    .update({
      where: { threadId_userId: { threadId: participant.threadId, userId: user.id } },
      data: { lastReadAt: new Date() },
    })
    .catch((err) => console.error("[messages/thread] failed to mark thread read:", err));

  const thread = await prisma.thread.findUnique({
    where: { id: params.threadId },
    select: {
      id: true,
      participantAId: true,
      participantBId: true,
      participantA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      participantB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  if (!thread) notFound();

  const other = thread.participantAId === user.id ? thread.participantB : thread.participantA;
  const blocked = await isBlockedEitherWay(user.id, other.id);

  const messages = await prisma.directMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      content: true,
      isDeleted: true,
      createdAt: true,
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  const initialMessages = messages.map((m) => ({
    id: m.id,
    content: m.isDeleted ? "" : m.content,
    isDeleted: m.isDeleted,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
  }));

  return (
    // Mobile thread layout (item 1, 2026-09-22, see DECISIONS.md): a
    // fixed h-dvh (dynamic viewport height, not min-h-screen's static
    // 100vh) column, with only the message list scrolling — this is
    // what actually keeps the composer above an open on-screen keyboard
    // on iOS/Android: dvh shrinks with the keyboard, static vh doesn't,
    // so a static-vh layout's flex-bottom composer sits behind the
    // keyboard instead of above it. The bottom tab bar is hidden for
    // this same route in BottomNav.tsx (its own pathname check) rather
    // than here, so there's no fixed nav competing for the same space.
    <div className="flex h-dvh flex-col overflow-hidden bg-ob-black text-ob-text">
      <header className="flex shrink-0 items-center justify-between border-b border-ob-border px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex min-w-0 items-center gap-2">
          <a href="/messages" aria-label="Back to Messages" className="shrink-0 p-1 -ml-1">
            <ArrowLeft size={20} strokeWidth={1.5} />
          </a>
          <a href={`/profile/${other.username}`} className="flex min-w-0 items-center gap-3">
            <div className="avatar h-9 w-9 shrink-0">
              {other.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatarUrl} alt={other.displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                  {other.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="text-h1 !text-xl truncate">{other.displayName}</p>
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <LeaveThreadButton threadId={thread.id} />
          <ContentMenu
            targetType="profile"
            targetId={other.id}
            preview={other.displayName}
            canReport
            blockUserId={other.id}
            blockInitialBlocked={blocked}
          />
        </div>
      </header>

      <DmThreadChat threadId={thread.id} currentUserId={user.id} initialMessages={initialMessages} />
    </div>
  );
}
