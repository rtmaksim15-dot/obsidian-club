import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";

// Admin: purchase-card batches (Invitation & Partner system v1,
// OBSIDIAN_ROADMAP_v3.1, 2026-08-01) — READ-ONLY HISTORICAL RECORD as of
// the Invitation Panel flow (2026-08-2x, see DECISIONS.md). New batches
// are never minted again; the generator form is gone and
// `POST /api/admin/invite-batches` returns 410. This page stays so the
// existing batches (including the now-revoked Batch 01) remain visible
// and their CSV/QR exports downloadable for the historical record — see
// A1's "do not drop, do not delete" instruction. Same not-discoverable
// pattern as every other admin page here — notFound(), not a
// redirect/403 page, for non-admins.
export default async function InviteBatchesPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const batches = await prisma.inviteBatch.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { tokens: true } } },
  });

  // Status counts per batch (reconciliation addendum Task 3, 2026-08-14)
  // — groupBy over the whole invite_tokens table, then bucketed by
  // batchId in memory, is one query regardless of batch count instead
  // of N.
  const statusRows = await prisma.inviteToken.groupBy({
    by: ["batchId", "status"],
    where: { batchId: { not: null } },
    _count: { _all: true },
  });
  const statusCountsByBatch = new Map<string, Record<string, number>>();
  for (const row of statusRows) {
    if (!row.batchId) continue;
    const bucket = statusCountsByBatch.get(row.batchId) ?? {};
    bucket[row.status] = row._count._all;
    statusCountsByBatch.set(row.batchId, bucket);
  }

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-2">Invite Batches</h1>
        <p className="text-caption mb-10" style={{ color: "var(--color-text-muted)" }}>
          Retired — historical record only. New invitations go through{" "}
          <a href="/admin/applications" className="underline">
            Applications
          </a>
          .
        </p>

        <div className="mt-10 space-y-3">
          {batches.length === 0 ? (
            <p className="text-body">No batches yet.</p>
          ) : (
            batches.map((b) => {
              const counts = statusCountsByBatch.get(b.id) ?? {};
              return (
                <a key={b.id} href={`/admin/invite-batches/${b.id}`} className="card group block">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-data transition-colors group-hover:text-ob-accent">
                        {new Date(b.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
                        {b.channel}
                        {b.campaign ? ` — ${b.campaign}` : ""}
                      </p>
                    </div>
                    <p className="text-caption text-right" style={{ color: "var(--color-text-muted)" }}>
                      {b._count.tokens} total
                      <br />
                      {counts.activated ?? 0} activated · {counts.opened ?? 0} opened · {counts.revoked ?? 0} revoked
                    </p>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
