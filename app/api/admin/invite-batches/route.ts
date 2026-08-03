import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generateInviteToken } from "@/lib/utils/codes";

const MAX_BATCH_SIZE = 500;

type Body = { count?: number | string };

// POST /api/admin/invite-batches — generates a batch of N purchase-card
// tokens (Invitation & Partner system v1, 2026-08-01). Card numbers are
// globally sequential across every batch ever created, not reset per
// batch, so a printed card's number is always unique — computed here as
// (current max) + 1..N inside the same transaction that inserts the
// tokens, to avoid a race against a second concurrent batch creation.
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

  const { _max } = await prisma.inviteToken.aggregate({
    where: { source: "purchase_card" },
    _max: { cardNumber: true },
  });
  const startNumber = (_max.cardNumber ?? 0) + 1;

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.inviteBatch.create({ data: { count } });
    await tx.inviteToken.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        token: generateInviteToken(),
        source: "purchase_card" as const,
        cardNumber: startNumber + i,
        batchId: created.id,
      })),
    });
    return created;
  });

  return NextResponse.json({ batchId: batch.id }, { status: 201 });
}
