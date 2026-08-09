import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import ReportsQueue, { type QueuedReport } from "@/components/shared/ReportsQueue";

// Admin report review (member protection mechanics, pre-launch legal
// package, 2026-08-09). Same not-discoverable pattern as every other
// admin page here — notFound(), not a redirect/403, for non-admins.
// Red-line categories (underage/non_consensual/threat) sort first so
// the highest-priority reports are never buried under routine ones.
export default async function AdminReportsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const reports = await prisma.report.findMany({
    where: { status: "open" },
    orderBy: [{ isRedLine: "desc" }, { createdAt: "asc" }],
    include: { reporter: { select: { displayName: true, username: true } } },
  });

  const postIds = reports.filter((r) => r.targetType === "post").map((r) => r.targetId);
  const profileIds = reports.filter((r) => r.targetType === "profile").map((r) => r.targetId);

  const [posts, profiles] = await Promise.all([
    postIds.length
      ? prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, content: true } })
      : Promise.resolve([]),
    profileIds.length
      ? prisma.user.findMany({ where: { id: { in: profileIds } }, select: { id: true, displayName: true } })
      : Promise.resolve([]),
  ]);
  const postById = new Map(posts.map((p) => [p.id, p]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const queued: QueuedReport[] = reports.map((r) => {
    const targetLabel =
      r.targetType === "post"
        ? (postById.get(r.targetId)?.content ?? "[post no longer exists]").slice(0, 80)
        : (profileById.get(r.targetId)?.displayName ?? "[member no longer exists]");
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      category: r.category,
      isRedLine: r.isRedLine,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter,
      targetLabel,
    };
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <a href="/admin" className="text-caption mb-6 inline-block" style={{ color: "var(--color-text-muted)" }}>
          ← Back
        </a>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-10">Reports</h1>
        <ReportsQueue initial={queued} />
      </div>
    </main>
  );
}
