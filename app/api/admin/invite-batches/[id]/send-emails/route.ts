import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { parseEmailNameCsv } from "@/lib/utils/csv";
import { sendInvitationEmail } from "@/lib/utils/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/admin/invite-batches/:id/send-emails — admin uploads a CSV
// of (email, name) for an email-channel batch; each valid row is paired
// with one of the batch's unused tokens and sent the invitation email
// (Batch Channels + Email Infra, 2026-08-07). Admin-triggered only — no
// self-serve sending exists anywhere in this app.
//
// Pairing is all-or-nothing: if the batch doesn't have enough unused
// tokens for every valid row, nothing is claimed or sent — the admin
// gets a clear count mismatch instead of a partially-sent batch that's
// confusing to reason about afterward.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const batch = await prisma.inviteBatch.findUnique({ where: { id: params.id } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }
  if (batch.channel !== "email") {
    return NextResponse.json({ error: "This batch isn't an email-channel batch." }, { status: 422 });
  }

  let text: string;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No CSV file uploaded." }, { status: 400 });
    }
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const rows = parseEmailNameCsv(text);
  const validRows = rows.filter((r) => EMAIL_PATTERN.test(r.email));
  const invalidCount = rows.length - validRows.length;

  if (validRows.length === 0) {
    return NextResponse.json({ error: "No valid (email, name) rows found in the CSV." }, { status: 422 });
  }

  const unusedTokens = await prisma.inviteToken.findMany({
    where: { batchId: batch.id, redeemedAt: null, sentToEmail: null },
    orderBy: { createdAt: "asc" },
    take: validRows.length,
  });

  if (unusedTokens.length < validRows.length) {
    return NextResponse.json(
      {
        error: `Not enough unused tokens in this batch: ${validRows.length} row(s), only ${unusedTokens.length} unused token(s) available.`,
      },
      { status: 422 },
    );
  }

  const results: { email: string; name: string; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const tokenRow = unusedTokens[i];

    // Claim before sending — `sentToEmail: null` in the where clause
    // means a second concurrent upload can't double-pair this token.
    const claim = await prisma.inviteToken.updateMany({
      where: { id: tokenRow.id, sentToEmail: null },
      data: { sentToEmail: row.email, sentToName: row.name },
    });
    if (claim.count === 0) {
      results.push({ email: row.email, name: row.name, ok: false, error: "Token already claimed." });
      continue;
    }

    const sendResult = await sendInvitationEmail(row.email, row.name, tokenRow.token);
    await prisma.inviteToken.update({
      where: { id: tokenRow.id },
      data: sendResult.ok
        ? { emailSentAt: new Date(), emailSendError: null }
        : { emailSendError: sendResult.error ?? "Unknown error" },
    });
    results.push({ email: row.email, name: row.name, ok: sendResult.ok, error: sendResult.error });
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({ sent, failed, invalidRowsSkipped: invalidCount, results });
}
