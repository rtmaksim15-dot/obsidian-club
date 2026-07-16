import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { awardRep } from "@/lib/rating/rep-engine";

type Body = { email?: string; delta?: number | string; reason?: string };

// POST /api/admin/rep-adjustment — manual REP adjustment (REP system +
// Vault task, Part A #3). Logged with source "admin-adjustment" so it's
// always distinguishable in RepHistory from a mechanically-earned event
// — a real admin event type, per the task, not a disguised regular one.
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

  const email = body.email?.trim().toLowerCase();
  const delta = Number(body.delta);
  const reason = body.reason?.trim();

  if (!email) {
    return NextResponse.json({ error: "Member email is required." }, { status: 422 });
  }
  if (!Number.isInteger(delta) || delta === 0) {
    return NextResponse.json({ error: "Amount must be a non-zero whole number." }, { status: 422 });
  }
  if (!reason) {
    return NextResponse.json({ error: "A reason is required." }, { status: 422 });
  }

  const member = await prisma.user.findUnique({ where: { email } });
  if (!member) {
    return NextResponse.json({ error: "No member with that email." }, { status: 404 });
  }

  await awardRep(member.id, delta, reason, "admin-adjustment");

  const updated = await prisma.user.findUnique({ where: { id: member.id }, select: { rep: true } });

  return NextResponse.json({ ok: true, rep: updated?.rep });
}
