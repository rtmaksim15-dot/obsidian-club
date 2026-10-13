import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAgeVerifiedApi } from "@/lib/age-verification/gate";
import { getRequestEligibility } from "@/lib/dm/eligibility";
import { checkDailyRequestLimit, DAILY_REQUEST_LIMIT } from "@/lib/dm/limits";
import { effectiveRequestStatus, isRequestExpired } from "@/lib/dm/lifecycle";
import { resolveAvatarUrls } from "@/lib/storage/resolve-media";
import { errCode } from "@/lib/utils/safe-error";

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
  const ageBlocked = requireAgeVerifiedApi(user);
  if (ageBlocked) return ageBlocked;

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
  const ageBlocked = requireAgeVerifiedApi(user);
  if (ageBlocked) return ageBlocked;

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
      { error: `You've reached today's limit of ${DAILY_REQUEST_LIMIT} requests. Try again tomorrow.` },
      { status: 429, headers: { "Retry-After": String(dailyLimit.retryAfterSeconds) } },
    );
  }

  const preCheck = await getRequestEligibility(user, recipientId);
  if (!preCheck.ok) {
    return NextResponse.json({ error: preCheck.error }, { status: preCheck.status });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-checked inside the transaction, against the transaction's
      // own client, to close the race between two near-simultaneous
      // requests to the same recipient (same reasoning as this
      // codebase's InviteToken redemption race fix — see DECISIONS.md).
      //
      // BUG FIX (Package 4 follow-up, 2026-10-13, see DECISIONS.md):
      // this transaction used to run at isolationLevel: Serializable —
      // the only place in this entire codebase that does. Phase A
      // added two new reads inside this same race-check (lib/dm/
      // boundaries.ts's getBoundariesVerdict: userProfile.findUnique,
      // and conditionally follow.findUnique) — under Postgres's
      // Serializable Snapshot Isolation, every read inside a
      // Serializable transaction contributes to predicate locking, and
      // user_profiles in particular is touched by a huge share of this
      // app's other traffic (ritual progress, Veil, Boundaries itself).
      // Broadening this transaction's read set was enough to make a
      // spurious "could not serialize access" conflict (Postgres
      // SQLSTATE 40001) a real, repeatable failure for a normal single
      // request, not just a theoretical concurrent-double-click edge
      // case — exactly matching the reported symptom (only brand-new
      // conversation starts fail; sending into an existing thread uses
      // a different route with no special isolation at all). That
      // error isn't an EligibilityError, so it fell through to the
      // generic catch-all below instead of a real reason. Dropped back
      // to the default isolation level (READ COMMITTED), same as every
      // other transaction in this app — the conditional re-check this
      // transaction already does is reasonable protection for the
      // narrow race it guards (two near-simultaneous requests from the
      // same sender to the same recipient); a database-level partial
      // unique index would close that race completely, but that's a
      // schema change needing its own explicit go-ahead, not bundled
      // into this fix — see DECISIONS.md/TECH_DEBT.md.
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
    });

    return NextResponse.json({ id: created.id, remaining: dailyLimit.remaining }, { status: 201 });
  } catch (err) {
    if (err instanceof EligibilityError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[dm/requests] Failed to create request:", errCode(err));
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
