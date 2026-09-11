import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generateInviteToken } from "@/lib/utils/codes";
import { computeValidUntil, HARD_CAP_DAYS } from "@/lib/invites/lifecycle";
import { sendPersonalInvitationEmail } from "@/lib/utils/email";
import { logModerationAction } from "@/lib/moderation/log";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = { email?: string; name?: string };

// POST /api/admin/invites/personal — Admin Console Zone 4 (2026-09-11,
// see DECISIONS.md), per direct instruction: an admin issues an
// invitation straight to an email address, bypassing the applications
// queue entirely -- no public form, no separate Accept step. Mints a
// real InviteToken exactly like an application's Accept does
// (generateInviteToken/computeValidUntil/HARD_CAP_DAYS, status
// "unused"), but source: "personal_invitation" (not "application") and
// no Waitlist row at all -- there's no application for this to attach
// to. /api/join/[token]/route.ts needs no change for this: every
// source-specific branch there is a positive `=== "member"` /
// `=== "partner"` check, so this new source already falls through
// exactly like purchase_card/application do today (no attribution, no
// REP, no Referral row).
//
// Send status is recorded on the InviteToken itself
// (sentToEmail/sentToName/emailSentAt/emailSendError) -- the same
// columns the email-channel batch flow already uses, despite their
// schema comment saying "batches only." That's the correct place for
// it: there's no Waitlist row here to hold Zone 1's decisionEmailSendError
// equivalent, and a failed send is intrinsically about this token's
// send, not an application decision.
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
  const name = body.name?.trim() || null;
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }

  const now = new Date();
  const token = await prisma.inviteToken.create({
    data: {
      token: generateInviteToken(),
      source: "personal_invitation",
      validUntil: computeValidUntil(now),
      clientWindowDays: HARD_CAP_DAYS,
      status: "unused",
      sentToEmail: email,
      sentToName: name,
    },
  });

  const result = await sendPersonalInvitationEmail(email, name, token.token);
  await prisma.inviteToken.update({
    where: { id: token.id },
    data: result.ok
      ? { emailSentAt: new Date(), emailSendError: null }
      : { emailSendError: result.error ?? "Unknown error" },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "invite_token.personal_invite_created",
    targetType: "invite_token",
    targetId: token.id,
    note: `Personal invitation sent to ${email}.`,
  });

  return NextResponse.json({ ok: true, tokenId: token.id, emailSent: result.ok });
}
