import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sendPersonalInvitationEmail, sendInvitationEmail } from "@/lib/utils/email";
import { logModerationAction } from "@/lib/moderation/log";

// POST /api/admin/invite-tokens/:id/resend — Admin Console Zone 4
// (2026-09-11, see DECISIONS.md). Reuses whichever email fits the
// token's source; never mints a new token, same "resend never re-mints"
// rule the applications flow's own resend action already follows. Only
// legal on a token that actually has an email to resend to
// (`sentToEmail` set) -- this naturally excludes member/partner tokens
// (plain copy-paste links, no email flow at all, "display-only" per
// instruction) and application-sourced tokens (their resend already
// lives at PATCH /api/admin/applications/[id], keyed off the Waitlist
// row, not this one) without needing an explicit source allow-list.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const token = await prisma.inviteToken.findUnique({ where: { id: params.id } });
  if (!token) {
    return NextResponse.json({ error: "Token not found." }, { status: 404 });
  }
  if (!token.sentToEmail) {
    return NextResponse.json({ error: "This invite has no email to resend to." }, { status: 422 });
  }
  if (token.redeemedAt) {
    return NextResponse.json({ error: "This invite has already been redeemed." }, { status: 409 });
  }
  if (token.revokedAt) {
    return NextResponse.json({ error: "This invite has been revoked." }, { status: 409 });
  }

  const result =
    token.source === "personal_invitation"
      ? await sendPersonalInvitationEmail(token.sentToEmail, token.sentToName, token.token)
      : await sendInvitationEmail(token.sentToEmail, token.sentToName ?? "", token.token);

  await prisma.inviteToken.update({
    where: { id: token.id },
    data: result.ok
      ? { emailSentAt: new Date(), emailSendError: null }
      : { emailSendError: result.error ?? "Unknown error" },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "invite_token.resent",
    targetType: "invite_token",
    targetId: token.id,
    note: `Resent to ${token.sentToEmail}.`,
  });

  return NextResponse.json({ ok: true, emailSent: result.ok });
}
