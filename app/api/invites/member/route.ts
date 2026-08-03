import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { generateInviteToken } from "@/lib/utils/codes";

// POST /api/invites/member — creates a personal single-use member-invite
// link for the caller (Invitation & Partner system v1, 2026-08-01).
// Gated two ways: `inviteAllowance` must be > 0, and there must be no
// existing unredeemed member-invite token already outstanding — "one
// active personal link at a time," matching the roadmap's "personal
// single-use link" framing. Allowance itself is spent at redemption
// (app/api/join/[token]/route.ts), not here — see DECISIONS.md.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  if (user.inviteAllowance <= 0) {
    return NextResponse.json({ error: "You have no invitations left." }, { status: 422 });
  }

  const outstanding = await prisma.inviteToken.findFirst({
    where: { source: "member", inviterId: user.id, redeemedAt: null },
  });
  if (outstanding) {
    return NextResponse.json({ error: "You already have an unused invitation." }, { status: 422 });
  }

  const token = await prisma.inviteToken.create({
    data: { token: generateInviteToken(), source: "member", inviterId: user.id },
  });

  return NextResponse.json({ token: token.token }, { status: 201 });
}
