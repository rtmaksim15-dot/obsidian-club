import { NextResponse } from "next/server";
import QRCode from "qrcode";
import JSZip from "jszip";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { joinUrl } from "@/lib/invites/lifecycle";

// GET /api/admin/invite-batches/:id/qr-zip — one QR PNG per token
// (encoding the same literal-domain join URL as the CSV export), zipped
// for the print run. Reconciliation addendum Task 3 (2026-08-14).
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

  const zip = new JSZip();
  for (const t of tokens) {
    const label = t.cardNumber !== null ? String(t.cardNumber).padStart(4, "0") : t.shortCode ?? t.id;
    const png = await QRCode.toBuffer(joinUrl(t.token), { type: "png", width: 512, margin: 2 });
    zip.file(`${label}.png`, png);
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="invite-batch-${batch.id}-qr.zip"`,
    },
  });
}
