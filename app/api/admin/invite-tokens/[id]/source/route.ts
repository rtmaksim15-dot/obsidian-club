import { NextResponse } from "next/server";
import type { InviteSource } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

const VALID_SOURCES: InviteSource[] = ["purchase_card", "member", "partner"];

// PATCH /api/admin/invite-tokens/:id/source — admin batch board,
// per-token assign-source (reconciliation addendum Task 3, 2026-08-14).
// Reassigns only the `source` enum, not `inviterId`/`partnerOfId` — those
// point at a specific member and picking one isn't part of this board;
// this control is for correcting a token minted under the wrong source
// (e.g. a QA-TEST token), not for wiring up member/partner attribution.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: { source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const source = body.source as InviteSource;
  if (!source || !VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source." }, { status: 422 });
  }

  const token = await prisma.inviteToken.findUnique({ where: { id: params.id } });
  if (!token) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  if (token.redeemedAt) {
    return NextResponse.json({ error: "This invite has already been redeemed and can't be reassigned." }, { status: 409 });
  }

  const updated = await prisma.inviteToken.update({ where: { id: token.id }, data: { source } });
  return NextResponse.json({ ok: true, source: updated.source });
}
