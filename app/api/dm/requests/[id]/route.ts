import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isBlockedEitherWay } from "@/lib/moderation/block";
import { effectiveRequestStatus } from "@/lib/dm/lifecycle";

type Body = { action?: "accept" | "decline" };

// PATCH /api/dm/requests/:id — item 3 (Outcomes). Accept opens the
// thread with the opening message already in it, at the message's real
// original timestamp (when it was actually written), not the moment of
// acceptance. Decline is reported back to the sender plainly, no
// reason — same "silence is not the answer" principle that already
// governs Waitlist's decline email in this codebase. Both are terminal;
// neither branch ever echoes the request's openingMessage back in the
// response — the recipient already has it from GET /api/dm/requests,
// there's nothing to gain by repeating it, and once declined it must
// not surface again anywhere (see DECISIONS.md, 2026-09-14).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.action !== "accept" && body.action !== "decline") {
    return NextResponse.json({ error: 'action must be "accept" or "decline".' }, { status: 422 });
  }

  const existing = await prisma.conversationRequest.findUnique({
    where: { id: params.id },
    select: { id: true, senderId: true, recipientId: true, openingMessage: true, status: true, createdAt: true },
  });
  // Same status for "doesn't exist" and "exists but isn't yours" —
  // nothing about a request should be discoverable from its id alone.
  if (!existing || existing.recipientId !== user.id) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const status = effectiveRequestStatus(existing);
  if (status !== "pending") {
    if (status === "expired" && existing.status === "pending") {
      // Lazily persist what effectiveRequestStatus already computed —
      // same write-on-read pattern GET /api/dm/requests uses.
      await prisma.conversationRequest.update({ where: { id: existing.id }, data: { status: "expired" } });
    }
    return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
  }

  if (body.action === "decline") {
    // Guarded the same way accept is below — a double-click shouldn't
    // fire the sender notification twice.
    const updated = await prisma.conversationRequest.updateMany({
      where: { id: existing.id, status: "pending" },
      data: { status: "declined", respondedAt: new Date() },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
    }
    await prisma.notification.create({
      data: {
        userId: existing.senderId,
        type: "dm.request_declined",
        title: `${user.displayName} declined your request`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Accept. Defense in depth: re-check the block in case one happened
  // after this request was shown to the recipient.
  if (await isBlockedEitherWay(existing.senderId, existing.recipientId)) {
    return NextResponse.json({ error: "You can't reach this member." }, { status: 403 });
  }

  try {
    const thread = await prisma.$transaction(async (tx) => {
      const newThread = await tx.thread.create({
        data: { participantAId: existing.senderId, participantBId: existing.recipientId },
      });
      await tx.threadParticipant.createMany({
        data: [
          { threadId: newThread.id, userId: existing.senderId },
          { threadId: newThread.id, userId: existing.recipientId },
        ],
      });
      await tx.directMessage.create({
        data: {
          threadId: newThread.id,
          senderId: existing.senderId,
          content: existing.openingMessage,
          createdAt: existing.createdAt,
          participantAId: existing.senderId,
          participantBId: existing.recipientId,
        },
      });

      // Guarded on `status: "pending"` so a double-click (two
      // near-simultaneous PATCH calls) can't both pass the earlier plain
      // SELECT and each create their own thread for the same request —
      // whichever transaction commits first wins this update; the other
      // gets count 0 and rolls its whole thread/messages back below.
      const updated = await tx.conversationRequest.updateMany({
        where: { id: existing.id, status: "pending" },
        data: { status: "accepted", respondedAt: new Date(), threadId: newThread.id },
      });
      if (updated.count === 0) {
        throw new AlreadyResolvedError();
      }

      await tx.notification.create({
        data: {
          userId: existing.senderId,
          type: "dm.request_accepted",
          title: `${user.displayName} accepted your request`,
          data: { threadId: newThread.id },
        },
      });
      return newThread;
    });

    return NextResponse.json({ threadId: thread.id });
  } catch (err) {
    if (err instanceof AlreadyResolvedError) {
      return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
    }
    console.error("[dm/requests/:id] Failed to accept:", err);
    return NextResponse.json({ error: "Could not accept. Try again shortly." }, { status: 503 });
  }
}

class AlreadyResolvedError extends Error {}
