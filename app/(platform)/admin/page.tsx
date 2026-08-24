import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import { getRitualCompleteMemberCount } from "@/lib/auth/ritual";

/**
 * Admin dashboard (`/admin`) — pre-launch cleanup 2, 2026-08-08. Numbers
 * only, one page, so the founder can watch the cohort gather without
 * SQL — this was previously a gap: `/admin` had no `page.tsx` of its
 * own (only its subroutes did), so it 404'd. Same not-discoverable
 * pattern as every other admin page here (`notFound()`, not a
 * redirect/403).
 *
 * Reuses `getRitualCompleteMemberCount()` (Doors mechanic, same day) —
 * a bounded 3-query set intersection, not N per-member `getRitualStatus`
 * calls, same reasoning as the antechamber's own counter.
 */
export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [
    activeMembers,
    ritualComplete,
    pendingApplications,
    publishedPosts,
    ageVerifiedMembers,
    openReports,
    batches,
    waitingListCount,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "active" } }),
    getRitualCompleteMemberCount(),
    prisma.waitlist.count({ where: { status: "pending" } }),
    prisma.post.count({ where: { isPublished: true } }),
    prisma.user.count({ where: { status: "active", ageVerified: true } }),
    prisma.report.count({ where: { status: "open" } }),
    prisma.inviteBatch.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tokens: true } } },
    }),
    // Landing-page pivot (2026-08-23) — the quiet secondary path's
    // count. See app/(platform)/admin/waiting-list/page.tsx for the list.
    prisma.waitingListEntry.count(),
  ]);

  const redeemedCounts = await Promise.all(
    batches.map((b) => prisma.inviteToken.count({ where: { batchId: b.id, redeemedAt: { not: null } } })),
  );

  const stats = [
    { label: "Active members", value: activeMembers },
    { label: "Ritual complete", value: ritualComplete },
    { label: "Pending applications", value: pendingApplications },
    { label: "Published posts", value: publishedPosts },
    { label: "Age verified", value: `${ageVerifiedMembers} / ${activeMembers}` },
    { label: "Open reports", value: openReports },
    { label: "Waiting list", value: waitingListCount },
  ];

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-10">Dashboard</h1>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="card">
              <p className="text-h1 !text-2xl">{s.value}</p>
              <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="text-label mt-10 mb-3">Invite batches — unused / redeemed</p>
        {batches.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            No batches yet.
          </p>
        ) : (
          <div className="space-y-2">
            {batches.map((b, i) => {
              const total = b._count.tokens;
              const redeemed = redeemedCounts[i];
              return (
                <a
                  key={b.id}
                  href={`/admin/invite-batches/${b.id}`}
                  className="card flex items-center justify-between"
                >
                  <div>
                    <p className="text-data !text-sm">
                      {new Date(b.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </p>
                    <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
                      {b.channel}
                      {b.campaign ? ` — ${b.campaign}` : ""}
                    </p>
                  </div>
                  <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                    {total - redeemed} unused / {redeemed} redeemed
                  </p>
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <a href="/admin/applications" className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Applications →
          </a>
          <a href="/admin/invite-batches" className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Invite Batches →
          </a>
          <a href="/admin/members" className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Members →
          </a>
          <a href="/admin/reports" className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Reports →
          </a>
          <a href="/admin/waiting-list" className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            Waiting List →
          </a>
        </div>
      </div>
    </main>
  );
}
