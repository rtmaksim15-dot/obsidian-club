import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getDoorsState, bypassesDoors } from "@/lib/config/doors";
import { needsDmRulesAcceptance } from "@/lib/legal/dm-rules";
import { effectiveRequestStatus, isRequestExpired } from "@/lib/dm/lifecycle";
import MessagesInbox from "@/components/shared/MessagesInbox";
import DmRulesGate from "@/components/shared/DmRulesGate";
import { resolveAvatarUrl } from "@/lib/storage/resolve-media";

// /messages (2026-09-14, see DECISIONS.md) — item 2: requests arrive
// here, not in a separate spam folder, alongside already-accepted
// conversations. Gated exactly like every other protected page (ritual
// complete or admin, then doors/antechamber) — item 7 only names
// sending as ritual-gated, but a different access rule for this one
// page than every other authenticated page would be its own kind of
// inconsistency, and the founder exception is already the established
// pattern everywhere else.
export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  // Ritual and Doors are checked separately (2026-09-18, launch preview,
  // see DECISIONS.md): a PREVIEW_USER_IDS account still has to pass the
  // ritual like a real member — only the holding-page gate is bypassed
  // for it (bypassesDoors also covers isAdmin, unchanged from before).
  if (!user.isAdmin) {
    if (!(await isRitualComplete(user))) redirect("/ritual");
  }
  if (!bypassesDoors(user) && getDoorsState().active) redirect("/antechamber");

  // Item 4 — applies to every member, admins included: this is a
  // feature-specific ruleset, not the ritual, and nothing carves out an
  // exception for it.
  if (await needsDmRulesAcceptance(user.id)) {
    return <DmRulesGate />;
  }

  const [requestRows, participations] = await Promise.all([
    prisma.conversationRequest.findMany({
      where: { recipientId: user.id, status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        openingMessage: true,
        createdAt: true,
        status: true,
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    }),
    prisma.threadParticipant.findMany({
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
    }),
  ]);

  // Same lazy write-on-read as GET /api/dm/requests.
  const expiredIds = requestRows.filter(isRequestExpired).map((r) => r.id);
  if (expiredIds.length > 0) {
    await prisma.conversationRequest.updateMany({ where: { id: { in: expiredIds } }, data: { status: "expired" } });
  }

  // Private storage (task 2, 2026-09-23, see DECISIONS.md).
  const requests = await Promise.all(
    requestRows
      .filter((r) => effectiveRequestStatus(r) === "pending")
      .map(async (r) => ({
        id: r.id,
        openingMessage: r.openingMessage,
        createdAt: r.createdAt.toISOString(),
        sender: { ...r.sender, avatarUrl: await resolveAvatarUrl(r.sender.avatarUrl) },
      })),
  );

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
  ).sort((a, b) => (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""));

  return <MessagesInbox initialRequests={requests} initialThreads={threads} />;
}
