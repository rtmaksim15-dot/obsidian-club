import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { getRequestEligibility } from "@/lib/dm/eligibility";
import { checkDailyRequestLimit } from "@/lib/dm/limits";
import { effectiveRequestStatus, isRequestExpired } from "@/lib/dm/lifecycle";
import { resolveAvatarUrls } from "@/lib/storage/resolve-media";

const MAX_MESSAGE_LENGTH = 1000;

// GET /api/dm/requests — the current user's own incoming pending
// requests (item 2: "Requests arrive in their direct messages, not in a
// separate spam folder"). Never returns anything but pending ones —
// a declined/expired/cancelled request's openingMessage is content the
// recipient never agreed to receive, so it must not surface in any list
// once it's no longer pending (see DECISIONS.md, 2026-09-14). Any row
// found naturally overdue is flipped to `expired` here as a side
// effect — the same lazy, read-time write this codebase already uses
// for other lifecycle state (no cron exists to do it any other way).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const rows = await prisma.conversationRequest.findMany({
    where: { recipientId: user.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      openingMessage: true,
      createdAt: true,
      status: true,
      sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const expiredIds = rows.filter(isRequestExpired).map((r) => r.id);
  if (expiredIds.length > 0) {
    await prisma.conversationRequest.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "expired" },
    });
  }

  const filtered = rows.filter((r) => effectiveRequestStatus(r) === "pending");
  const avatarUrls = await resolveAvatarUrls(filtered.map((r) => r.sender.avatarUrl));
  const pending = filtered.map((r, i) => ({
    id: r.id,
    openingMessage: r.openingMessage,
    createdAt: r.createdAt.toISOString(),
    sender: { ...r.sender, avatarUrl: avatarUrls[i] },
  }));

  return NextResponse.json({ requests: pending });
}

type Body = { recipientId?: string; message?: string };

// POST /api/dm/requests — "Request a conversation" (item 1). Sending
// makes the request; it does not open a thread (see PATCH
// /api/dm/requests/[id] for accept/decline, landing in the next step).
export async function POST(request: Request) {
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

  const recipientId = body.recipientId?.trim();
  if (!recipientId) {
    return NextResponse.json({ error: "Missing recipient." }, { status: 422 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "An opening message is required." }, { status: 422 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long." }, { status: 422 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // Cheaper check first, before touching eligibility's several queries —
  // matches every other rate-limited route in this codebase.
  const dailyLimit = await checkDailyRequestLimit(user.id);
  if (!dailyLimit.allowed) {
    return NextResponse.json(
      { error: "You've reached today's limit of 5 requests. Try again tomorrow." },
      { status: 429, headers: { "Retry-After": String(dailyLimit.retryAfterSeconds) } },
    );
  }

  const preCheck = await getRequestEligibility(user, recipientId);
  if (!preCheck.ok) {
    return NextResponse.json({ error: preCheck.error }, { status: preCheck.status });
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        // Re-checked inside the transaction, against the transaction's
        // own client, to close the race between two near-simultaneous
        // requests to the same recipient (same reasoning as this
        // codebase's InviteToken redemption race fix — see DECISIONS.md).
        const raceCheck = await getRequestEligibility(user, recipientId, tx);
        if (!raceCheck.ok) {
          throw new EligibilityError(raceCheck.status, raceCheck.error);
        }

        const req = await tx.conversationRequest.create({
          data: { senderId: user.id, recipientId, openingMessage: message },
          select: { id: true },
        });

        await tx.notification.create({
          data: {
            userId: recipientId,
            type: "dm.request_received",
            title: `${user.displayName} wants to talk`,
            body: message.length > 140 ? `${message.slice(0, 140)}…` : message,
            data: { requestId: req.id },
          },
        });

        return req;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return NextResponse.json({ id: created.id, remaining: dailyLimit.remaining }, { status: 201 });
  } catch (err) {
    if (err instanceof EligibilityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dm/requests] Failed to create request:", err);
    return NextResponse.json({ error: "Could not send. Try again shortly." }, { status: 503 });
  }
}

class EligibilityError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
