import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { computeClientExpiresAt, evaluateTokenLifecycle } from "@/lib/invites/lifecycle";

// POST /api/admin/invite-tokens/:id/arm — admin batch board, manual Arm
// (reconciliation addendum Task 3, 2026-08-14). Same effect as a
// member's first scan of /join/[token] (firstScannedAt/clientExpiresAt/
// status=opened) but triggerable from the admin board — mainly for QA
// (Task 4 needs arming without actually visiting the link) and for
// admins confirming a physical card is live before handing it out.
// No-ops (200, unchanged) if the token isn't in an armable state.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const token = await prisma.inviteToken.findUnique({ where: { id: params.id } });
  if (!token) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }

  if (token.firstScannedAt) {
    return NextResponse.json({ ok: true, status: token.status, alreadyArmed: true });
  }
  const lifecycle = evaluateTokenLifecycle(token);
  if (!lifecycle.ok) {
    return NextResponse.json({ error: "This invite is no longer in an armable state." }, { status: 409 });
  }

  const now = new Date();
  const updated = await prisma.inviteToken.update({
    where: { id: token.id },
    data: {
      firstScannedAt: now,
      clientExpiresAt: computeClientExpiresAt(now, token.clientWindowDays, token.validUntil),
      status: "opened",
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
