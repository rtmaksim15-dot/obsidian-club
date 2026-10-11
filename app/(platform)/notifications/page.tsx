import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// Same member-facing timestamp format PostCard.tsx already uses
// (UTC, not the admin console's America/New_York formatter — that one
// is specifically for the admin's own timezone, not a member's).
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

// Notifications (Phase B, B1, 2026-10-10, see DECISIONS.md) — the
// `Notification` model already existed and was already written to
// (level-ups, DM-request replies, welcome messages) but had no reader
// anywhere. The top bar's bell needed a real destination for its badge
// count to mean something, so this is the first list view for it.
// Viewing the list marks everything currently unread as read — no
// separate "mark all read" control, matching how /messages already
// treats opening a thread as reading it.
export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
  if (unreadIds.length > 0) {
    await prisma.notification.updateMany({ where: { id: { in: unreadIds } }, data: { isRead: true } });
  }

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-h1 mb-6">Notifications</h1>
        {notifications.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            Nothing here yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {notifications.map((n) => (
              <li key={n.id} className="pb-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
                {n.title ? <p className="text-data">{n.title}</p> : null}
                {n.body ? (
                  <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {n.body}
                  </p>
                ) : null}
                <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {formatDate(n.createdAt.toISOString())}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
