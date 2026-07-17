import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

type Body = { action?: "approve" | "decline" };

// PATCH /api/admin/applications/:id — approve or decline a waitlist entry.
//
// Closed Registration & Invite System (2026-07-17): approving no longer
// creates the account itself — it only generates a one-time invite token
// and returns the resulting link for the admin to copy and send
// manually. The account (Supabase Auth user, `public.users` row,
// referral resolution, REP awards) is only created when that link is
// actually redeemed — see app/api/invite/[token]/route.ts. This replaces
// the old flow (create the account immediately + auto-email a Supabase-
// generated invite link via Resend), which had a real gap: the emailed
// link never actually prompted for a password anywhere, so a member who
// clicked it ended up with an account they could never log back into
// once that one-time link was spent. See DECISIONS.md.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

  if (body.action !== "approve" && body.action !== "decline") {
    return NextResponse.json({ error: 'action must be "approve" or "decline".' }, { status: 422 });
  }

  const application = await prisma.waitlist.findUnique({ where: { id: params.id } });
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (application.status !== "pending") {
    return NextResponse.json(
      { error: `Already ${application.status}.` },
      { status: 409 }
    );
  }

  if (body.action === "decline") {
    // PRODUCT.md §1: declines carry no explanation — that opacity is
    // intentional, so no email is sent here.
    await prisma.waitlist.update({
      where: { id: application.id },
      data: { status: "declined", reviewedAt: new Date(), reviewedBy: admin.id },
    });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  // --- approve: generate the one-time invite token, nothing else yet ---
  const inviteToken = randomBytes(24).toString("hex");

  await prisma.waitlist.update({
    where: { id: application.id },
    data: {
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      inviteToken,
    },
  });

  const { origin } = new URL(request.url);
  return NextResponse.json({
    ok: true,
    status: "approved",
    inviteUrl: `${origin}/invite/${inviteToken}`,
  });
}
