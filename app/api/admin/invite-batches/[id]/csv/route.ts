import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// GET /api/admin/invite-batches/:id/csv — CSV export for print (card
// number, token, full URL). Same `NEXT_PUBLIC_APP_URL` fallback pattern
// already used for the old referral link on /hall — see TECH_DEBT.md
// for the standing note that this needs to be set in real production
// for either link to print/share correctly.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const batch = await prisma.inviteBatch.findUnique({ where: { id: params.id } });
  if (!batch) {
    return NextResponse.json({ error: "Batch not found." }, { status: 404 });
  }

  const tokens = await prisma.inviteToken.findMany({
    where: { batchId: batch.id },
    orderBy: { cardNumber: "asc" },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const rows = [
    ["Card Number", "Token", "URL"],
    ...tokens.map((t) => [
      String(t.cardNumber).padStart(4, "0"),
      t.token,
      `${baseUrl}/join/${t.token}`,
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
