import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isBlockedEitherWay } from "@/lib/moderation/block";
import { resolveAvatarUrl, resolveAvatarUrls } from "@/lib/storage/resolve-media";

const PAGE_SIZE = 100;
const MAX_MESSAGE_LENGTH = 2000;

const messageSelect = {
  id: true,
  content: true,
  isDeleted: true,
  createdAt: true,
  sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
};

// A left participant loses both read and write access — "leave the
// conversation" is a full exit, not a mute. Returns null (same shape
// used for "doesn't exist" — see the accept/decline route) rather than
// distinguishing "no such thread" from "you left it" or "never were in
// it," so nothing about a thread's existence or membership is
// discoverable from its id alone.
async function requireActiveParticipant(threadId: string, userId: string) {
  const participant = await prisma.threadParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
  });
  if (!participant || participant.leftAt) return null;
  return participant;
}

// GET /api/dm/threads/:id/messages — "no endpoint may return a message
// without verifying the caller is a participant" (see DECISIONS.md,
// 2026-09-14). Mirrors GET /api/rooms/:slug/messages's tombstone
// redaction for isDeleted rows — laid down for a future moderation
// surface, not built in this pass.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  if (!(await requireActiveParticipant(params.id, user.id))) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = await prisma.directMessage.findMany({
    where: { threadId: params.id },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    select: messageSelect,
  });

  const redacted = messages.map((m) => (m.isDeleted ? { ...m, content: "" } : m));
  const avatarUrls = await resolveAvatarUrls(redacted.map((m) => m.sender.avatarUrl));
  const resolved = redacted.map((m, i) => ({ ...m, sender: { ...m.sender, avatarUrl: avatarUrls[i] } }));
  return NextResponse.json({ messages: resolved.reverse() });
}

type Body = { content?: string };

// POST /api/dm/threads/:id/messages
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  if (!(await requireActiveParticipant(params.id, user.id))) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 422 });
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long." }, { status: 422 });
  }

  const thread = await prisma.thread.findUnique({
    where: { id: params.id },
    select: { participantAId: true, participantBId: true },
  });
  if (!thread) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  // Item 5: a block "prevents any future request" and, per instruction,
  // also rejects new messages into an existing thread — history stays
  // readable (preserve, never delete), only sending is cut off.
  const otherId = thread.participantAId === user.id ? thread.participantBId : thread.participantAId;
  if (await isBlockedEitherWay(user.id, otherId)) {
    return NextResponse.json({ error: "You can't send messages in this conversation." }, { status: 403 });
  }

  try {
    const message = await prisma.directMessage.create({
      data: {
        threadId: params.id,
        senderId: user.id,
        content,
        participantAId: thread.participantAId,
        participantBId: thread.participantBId,
      },
      select: messageSelect,
    });
    const resolvedMessage = { ...message, sender: { ...message.sender, avatarUrl: await resolveAvatarUrl(message.sender.avatarUrl) } };
    return NextResponse.json({ message: resolvedMessage }, { status: 201 });
  } catch (err) {
    console.error("[dm/threads/messages] Failed to create message:", err);
    return NextResponse.json({ error: "Could not send. Try again shortly." }, { status: 503 });
  }
}
