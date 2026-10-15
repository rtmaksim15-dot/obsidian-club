import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { joinUrl } from "@/lib/invites/lifecycle";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// GET /api/admin/invite-batches/:id/csv — CSV export for print (card
// number, token, short code, join URL). Reconciliation addendum
// (2026-08-14): switched from the `NEXT_PUBLIC_APP_URL` fallback to the
// literal production domain (see lib/invites/lifecycle.ts#JOIN_BASE_URL)
// — this export feeds physical, unreprintable cards.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const batch = await prisma.inviteBatch.findUnique({ where: { id: params.id } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }

  const tokens = await prisma.inviteToken.findMany({
    where: { batchId: batch.id },
    orderBy: { cardNumber: "asc" },
  });

  const rows = [
    ["Card Number", "Token", "Short Code", "URL"],
    ...tokens.map((t) => [
      t.cardNumber !== null ? String(t.cardNumber).padStart(4, "0") : "",
      t.token,
      t.shortCode ?? "",
      joinUrl(t.token),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invite-batch-${batch.id}.csv"`,
    },
  });
}
