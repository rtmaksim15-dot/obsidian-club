import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { generateInviteToken } from "@/lib/utils/codes";

// POST /api/invites/partner — creates a single-use partner link for the
// caller (Invitation & Partner system v1, 2026-08-01). Separate from
// member invites entirely: doesn't check or spend `inviteAllowance`.
// Gated on: the caller doesn't already have a partner (`partner` or the
// reverse `partnerOf`), and there's no unredeemed partner token already
// outstanding — one partner per member, one active link at a time.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const withPartner = await prisma.user.findUnique({
    where: { id: user.id },
    include: { partner: true, partnerOf: true },
  });
  if (withPartner?.partner || withPartner?.partnerOf) {
    return NextResponse.json({ error: "You already have a partner." }, { status: 422 });
  }

  const outstanding = await prisma.inviteToken.findFirst({
    where: { source: "partner", partnerOfId: user.id, redeemedAt: null },
  });
  if (outstanding) {
    return NextResponse.json({ error: "You already have an unused partner link." }, { status: 422 });
  }

  const token = await prisma.inviteToken.create({
    data: { token: generateInviteToken(), source: "partner", partnerOfId: user.id },
  });

  return NextResponse.json({ token: token.token }, { status: 201 });
}
