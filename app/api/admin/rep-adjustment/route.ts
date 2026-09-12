import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { awardRep } from "@/lib/rating/rep-engine";
import { REP_UI_ENABLED } from "@/lib/config/feature-flags";
import { logModerationAction } from "@/lib/moderation/log";

type Body = { email?: string; delta?: number | string; reason?: string };

// POST /api/admin/rep-adjustment — manual REP adjustment (REP system +
// Vault task, Part A #3). Logged with source "admin-adjustment" so it's
// always distinguishable in RepHistory from a mechanically-earned event
// — a real admin event type, per the task, not a disguised regular one.
//
// Feed-first v1 (2026-07-27): 404s unconditionally while REP_UI_ENABLED
// is false, same as /admin/rep (the page this posts to) — closes the
// gap where the page was undiscoverable but this endpoint still worked
// for anyone who already knew it, flagged in TECH_DEBT.md.
//
// Attribution gap closed (2026-09-11, see DECISIONS.md): unlike every
// other admin action in this app (ageVerified toggles, invite-token
// actions, report resolutions), this one never wrote a ModerationAction
// — RepHistory.source "admin-adjustment" records that *an* admin made
// the change, but not which one. Flagged during the Admin Console
// Zone 2 build (this endpoint is unreachable while REP_UI_ENABLED is
// false, so it went unnoticed), fixed the same way Gap 4 fixed the
// others.
export async function POST(request: Request) {
  if (!REP_UI_ENABLED) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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

  await logModerationAction({
    adminId: admin.id,
    action: "user.rep_adjusted",
    targetType: "user",
    targetId: member.id,
    note: `delta: ${delta > 0 ? "+" : ""}${delta}, reason: ${reason}`,
  });

  const updated = await prisma.user.findUnique({ where: { id: member.id }, select: { rep: true } });

  return NextResponse.json({ ok: true, rep: updated?.rep });
}
