import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getInviteListReconciliation } from "@/lib/invites/reconciliation";
import { formatAdminDateTime, formatAdminDateOnly } from "@/lib/admin/format-date";

// /admin/invites — Invite list reconciliation, 2026-11-21 (see
// DECISIONS.md). Same "direct-URL only, not linked from the console"
// pattern as /admin/rep and /admin/invite-batches — a one-off
// reconciliation view for a one-off import, not a permanent nav
// destination. 404, not a redirect, for non-admins (same obscurity
// posture as every other admin page here). Names/emails below are the
// ONE place in this app allowed to show them for this data — never
// logged, never printed to a terminal (scripts/import-invite-list.ts
// and this page are the only two places invite_list PII is ever
// touched at all).
export default async function AdminInvitesPage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const { totals, byCountry, registrationsByDay, unmatchedUsers } = await getInviteListReconciliation();

  return (
    <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
      <div className="mx-auto max-w-3xl">
        <p className="text-label mb-2">Admin</p>
        <h1 className="text-h1 mb-10">Invite List Reconciliation</h1>

        <section className="mb-10">
          <p className="text-label mb-3">Totals</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Invited", value: totals.invited },
              { label: "Registered", value: totals.registered },
              { label: "Pending approval", value: totals.pendingApproval },
              { label: "Approved", value: totals.approved },
              { label: "Conversion", value: `${totals.conversionRate}%` },
            ].map((stat) => (
              <div key={stat.label} className="card px-4 py-3 text-center">
                <p className="text-h2 !text-xl">{stat.value}</p>
                <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <p className="text-label mb-3">By country</p>
          {byCountry.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No data yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {byCountry.map((row) => (
                <li key={row.country} className="flex items-center justify-between py-1 text-caption">
                  <span>{row.country}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>
                    {row.registered} registered / {row.invited} invited
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-10">
          <p className="text-label mb-3">Registrations by day (since 2026-11-21)</p>
          {registrationsByDay.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No registrations yet.
            </p>
          ) : (
            <ul className="space-y-1">
              {registrationsByDay.map((row) => (
                <li key={row.day} className="flex items-center justify-between py-1 text-caption">
                  <span>{formatAdminDateOnly(row.day)}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="text-label mb-3">
            Registered members NOT on the invite list ({unmatchedUsers.length})
          </p>
          {unmatchedUsers.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              None — every registered member matches the invite list.
            </p>
          ) : (
            <ul className="space-y-2">
              {unmatchedUsers.map((u) => (
                <li key={u.id} className="card px-4 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-data">{u.displayName}</p>
                    <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                      {formatAdminDateTime(u.joinedAt)}
                    </p>
                  </div>
                  <p className="text-caption mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {u.email}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
