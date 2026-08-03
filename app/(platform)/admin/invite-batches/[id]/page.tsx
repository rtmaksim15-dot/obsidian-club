import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";

// Admin: single purchase-card batch, per-card status (Invitation &
// Partner system v1, 2026-08-01).
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
        <a
          href={`/api/admin/invite-batches/${batch!.id}/csv`}
          className="btn-secondary mt-4 inline-block"
          download
        >
          Download CSV
        </a>

        <div className="mt-10">
          {tokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
            >
              <p className="text-data">№ {String(t.cardNumber).padStart(4, "0")}</p>
              {t.redeemedBy ? (
                <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                  Redeemed by {t.redeemedBy.displayName} ({new Date(t.redeemedAt!).toLocaleDateString("en-US", { timeZone: "UTC" })})
                </p>
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
