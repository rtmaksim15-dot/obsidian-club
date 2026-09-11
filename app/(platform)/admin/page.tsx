import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import AdminConsole from "@/components/admin/AdminConsole";

// Admin Console (2026-09-09, see DECISIONS.md) — Part B of the
// invitation-flow work. One route, one screen: this replaces
// /admin/applications, /admin/members, /admin/reports, and
// /admin/waiting-list (all now redirect here) as a single operational
// console with four in-place zones. /admin/invite-batches and
// /admin/rep are untouched for now — neither was named in the fold
// instruction, and invite-batches' function is superseded by Zone 4
// but not yet redirected until that zone actually lands.
//
// Step 1 (2026-09-09 commit): shell, zone switching, and panel
// open/close mechanics. Step 2 (2026-09-10, see DECISIONS.md): the
// status bar's six counts, each clickable to filter the zone below.
// "Failed sends" (decisionEmailSendError) can land on an
// already-decided application (the accept/decline call succeeded, only
// the email didn't), so the applications fetch below is a superset of
// the pending/held queue -- an OR, not an AND -- specifically so a
// failed send is never invisible just because its status has moved on.
// Full per-zone depth (consent history, RepHistory, side-by-side
// arbitration, token actions) is built out in the steps that follow,
// per the specified order. Same notFound()-not-redirect pattern as
// every other admin page.
export default async function AdminConsolePage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [applications, people, reports, tokens, counts] = await Promise.all([
    prisma.waitlist.findMany({
      where: {
        OR: [{ status: { in: ["pending", "held"] } }, { decisionEmailSendError: { not: null } }],
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.report.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.inviteToken.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    Promise.all([
      prisma.waitlist.count({ where: { status: "pending" } }),
      prisma.waitlist.count({ where: { status: "held" } }),
      prisma.waitlist.count({ where: { decisionEmailSendError: { not: null } } }),
      prisma.report.count({ where: { status: "open" } }),
      prisma.user.count({ where: { status: "active" } }),
      prisma.user.count({ where: { status: "active", ageVerified: false } }),
    ]).then(([pending, held, failedSend, openReports, membersTotal, notAgeVerified]) => ({
      pending,
      held,
      failedSend,
      openReports,
      membersTotal,
      notAgeVerified,
    })),
  ]);

  return (
    <AdminConsole
      counts={counts}
      applications={applications.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        status: a.status,
        decisionEmailSendError: a.decisionEmailSendError,
        createdAt: a.createdAt.toISOString(),
      }))}
      people={people.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        email: p.email,
        rep: p.rep,
        level: p.level,
        ageVerified: p.ageVerified,
      }))}
      reports={reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        category: r.category,
        createdAt: r.createdAt.toISOString(),
      }))}
      tokens={tokens.map((t) => ({
        id: t.id,
        source: t.source,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      }))}
    />
  );
}
