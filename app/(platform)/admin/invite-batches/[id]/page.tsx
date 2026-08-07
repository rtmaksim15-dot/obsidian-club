import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import InviteBatchEmailUploader from "@/components/shared/InviteBatchEmailUploader";

// Admin: single invite batch, per-token status (Invitation & Partner
// system v1, 2026-08-01; channel/campaign + email sending added by
// Batch Channels + Email Infra, 2026-08-07). Print/letter batches keep
// the original CSV-export mechanic (cards printed or mailed by hand);
// email batches get the CSV-upload sender instead, and each token's row
// shows send status (sent/failed/pending) rather than a plain
// redeemed/unused split, since "sent but not yet redeemed" is now a
// real, distinct state worth seeing.
export default async function InviteBatchDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const batch = await prisma.inviteBatch.findUnique({ where: { id: params.id } });
  if (!batch) {
    notFound();
  }

  const tokens = await prisma.inviteToken.findMany({
    where: { batchId: batch!.id },
    orderBy: { cardNumber: "asc" },
    include: { redeemedBy: { select: { displayName: true, username: true } } },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <a href="/admin/invite-batches" className="text-caption mb-6 inline-block" style={{ color: "var(--color-text-muted)" }}>
          ← Back
        </a>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-2">
          Batch — {new Date(batch!.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
        </h1>
        <p className="text-caption mb-6" style={{ color: "var(--color-text-muted)" }}>
          {batch!.channel}
          {batch!.campaign ? ` — ${batch!.campaign}` : ""}
        </p>

        {batch!.channel === "email" ? (
          <InviteBatchEmailUploader batchId={batch!.id} />
        ) : (
          <a
            href={`/api/admin/invite-batches/${batch!.id}/csv`}
            className="btn-secondary mt-4 inline-block"
            download
          >
            Download CSV
          </a>
        )}

        <div className="mt-10">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <p className="text-data">
                {t.cardNumber !== null ? `№ ${String(t.cardNumber).padStart(4, "0")}` : t.sentToEmail ?? "—"}
              </p>
              {t.redeemedBy ? (
                <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                  Redeemed by {t.redeemedBy.displayName} ({new Date(t.redeemedAt!).toLocaleDateString("en-US", { timeZone: "UTC" })})
                </p>
              ) : batch!.channel === "email" && t.sentToEmail ? (
                t.emailSentAt ? (
                  <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                    Sent to {t.sentToName || t.sentToEmail} ({new Date(t.emailSentAt).toLocaleDateString("en-US", { timeZone: "UTC" })})
                  </p>
                ) : (
                  <p className="text-caption" style={{ color: "var(--color-error)" }}>
                    Failed — {t.emailSendError ?? "unknown error"}
                  </p>
                )
              ) : (
                <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                  Unused
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
