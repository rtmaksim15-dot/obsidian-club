import { NextResponse } from "next/server";
import type { InviteChannel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generateInviteToken } from "@/lib/utils/codes";

const MAX_BATCH_SIZE = 500;
const VALID_CHANNELS: InviteChannel[] = ["print", "email", "letter"];

type Body = { count?: number | string; channel?: string; campaign?: string };

// POST /api/admin/invite-batches — generates a batch of N purchase-card
// tokens (Invitation & Partner system v1, 2026-08-01). Card numbers are
// globally sequential across every batch ever created, not reset per
// batch, so a printed card's number is always unique — computed here as
// (current max) + 1..N inside the same transaction that inserts the
// tokens, to avoid a race against a second concurrent batch creation.
// `channel`/`campaign` (Batch Channels, 2026-08-07) — channel defaults
// to "print" (every batch before this was implicitly print).
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const count = typeof body.count === "string" ? parseInt(body.count, 10) : body.count;
  if (!count || !Number.isInteger(count) || count < 1) {
    return NextResponse.json({ error: "Count must be a positive whole number." }, { status: 422 });
  }
  if (count > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `Batches are capped at ${MAX_BATCH_SIZE} cards.` }, { status: 422 });
  }

  const channel = (body.channel || "print") as InviteChannel;
  if (!VALID_CHANNELS.includes(channel)) {
    return NextResponse.json({ error: "Invalid channel." }, { status: 422 });
  }
  const campaign = body.campaign?.trim() || null;

  // Card numbers only mean anything for a physical print run — an
  // email or letter batch has no printed card to number, so its tokens
  // get no `cardNumber` at all rather than silently burning numbers out
  // of the print sequence.
  let startNumber = 0;
  if (channel === "print") {
    const { _max } = await prisma.inviteToken.aggregate({
      where: { source: "purchase_card" },
      _max: { cardNumber: true },
    });
    startNumber = (_max.cardNumber ?? 0) + 1;
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.inviteBatch.create({ data: { count, channel, campaign } });
    await tx.inviteToken.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        token: generateInviteToken(),
        source: "purchase_card" as const,
        cardNumber: channel === "print" ? startNumber + i : null,
        batchId: created.id,
      })),
    });
    return created;
  });

  return NextResponse.json({ batchId: batch.id }, { status: 201 });
}
