import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";

// Admin: the landing page's quiet secondary path (landing-page pivot,
// 2026-08-23, see DECISIONS.md) — a plain list with a count, no
// actions yet. Deliberately not merged with the Applications queue:
// WaitingListEntry isn't an application (see that model's own
// comment), so this stays its own small, separate screen.
export default async function AdminWaitingListPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const entries = await prisma.waitingListEntry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <a href="/admin" className="text-caption mb-6 inline-block" style={{ color: "var(--color-text-muted)" }}>
          ← Back
        </a>
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-2">Waiting List</h1>
        <p className="text-caption mb-10" style={{ color: "var(--color-text-muted)" }}>
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>

        {entries.length === 0 ? (
          <p className="text-body">No entries yet.</p>
        ) : (
          <div>
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
              >
                <p className="text-data">{e.email}</p>
                <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(e.createdAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
                  {e.invitedAt ? " — invited" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
