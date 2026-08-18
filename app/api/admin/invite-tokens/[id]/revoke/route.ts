import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

// POST /api/admin/invite-tokens/:id/revoke — admin batch board, per-token
// Revoke (reconciliation addendum Task 3, 2026-08-14). Only blocks a
// token that hasn't already been redeemed — once an account exists from
// it, revoking is meaningless (evaluateTokenLifecycle checks
// `redeemedAt` before `revokedAt` never runs for a used token anyway,
// but rejecting here avoids a misleading "revoked" status sitting next
// to a real member's redemption).
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const token = await prisma.inviteToken.findUnique({ where: { id: params.id } });
  if (!token) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  if (token.redeemedAt) {
    return NextResponse.json({ error: "This invite has already been redeemed and can't be revoked." }, { status: 409 });
  }

  const updated = await prisma.inviteToken.update({
    where: { id: token.id },
    data: { revokedAt: new Date(), status: "revoked" },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}
