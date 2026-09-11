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
// Step 1 (this commit): shell, zone switching, and panel open/close
// mechanics only. Each zone below is a minimal, real (not fake) list —
// full per-zone depth (consent history, RepHistory, side-by-side
// arbitration, token actions) is built out in the steps that follow,
// per the specified order. Same notFound()-not-redirect pattern as
// every other admin page.
export default async function AdminConsolePage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [applications, people, reports, tokens] = await Promise.all([
    prisma.waitlist.findMany({
      where: { status: { in: ["pending", "held"] } },
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
  ]);

  return (
    <AdminConsole
      applications={applications.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      }))}
      people={people.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        email: p.email,
        rep: p.rep,
        level: p.level,
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
