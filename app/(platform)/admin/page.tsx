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
//
// Step 3 (2026-09-10): Zone 1 (Applications) full depth. Reuses the
// existing PATCH /api/admin/applications/[id] action route unchanged
// (approve/decline/hold/resend) -- components/shared/ApplicationsQueue.tsx
// had this logic already; ApplicationDetail.tsx below ports its
// interaction pattern into a single-row detail-panel shape instead of a
// list of cards. "Consent history" and "decision history" turned out to
// be aspirational per-zone language, not real schema, per the research
// pass ahead of this step -- there is no consent record for anyone who
// hasn't redeemed an invite yet (LegalConsent requires a User row), and
// reviewedAt/reviewedBy/heldReason/heldNote are last-value-wins columns,
// not an append-only log. By instruction: show what's actually real
// (current reviewer, current hold state, decision-email status, the
// admin's own age-verified attestation), add no new model. A proper
// audit-log model is a separate task after Part B, alongside
// reconstructing the missing DECISIONS.md entries.
//
// Full per-zone depth for People/Arbitration/Invitations is still built
// out in the steps that follow, per the specified order. Same
// notFound()-not-redirect pattern as every other admin page.
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
      select: {
        id: true,
        name: true,
        email: true,
        age: true,
        city: true,
        source: true,
        reason: true,
        referralCode: true,
        origin: true,
        status: true,
        createdAt: true,
        heldReason: true,
        heldNote: true,
        heldAt: true,
        reviewedAt: true,
        reviewedBy: true,
        ageVerified: true,
        ageVerifiedAt: true,
        applicationTokenId: true,
        decisionEmailSentAt: true,
        decisionEmailSendError: true,
      },
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

  // reviewedBy is a raw User.id, not a Prisma relation (see schema
  // comment on Waitlist) — resolved here in one extra query rather than
  // per-row, since in practice there's only ever been one admin.
  const reviewerIds = Array.from(new Set(applications.map((a) => a.reviewedBy).filter((id): id is string => Boolean(id))));
  const reviewers = reviewerIds.length
    ? await prisma.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, displayName: true } })
    : [];
  const reviewerNameById = new Map(reviewers.map((r) => [r.id, r.displayName]));

  return (
    <AdminConsole
      counts={counts}
      applications={applications.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        age: a.age,
        city: a.city,
        source: a.source,
        reason: a.reason,
        referralCode: a.referralCode,
        origin: a.origin,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        heldReason: a.heldReason,
        heldNote: a.heldNote,
        heldAt: a.heldAt ? a.heldAt.toISOString() : null,
        reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
        reviewerName: a.reviewedBy ? (reviewerNameById.get(a.reviewedBy) ?? null) : null,
        ageVerified: a.ageVerified,
        ageVerifiedAt: a.ageVerifiedAt ? a.ageVerifiedAt.toISOString() : null,
        hasToken: Boolean(a.applicationTokenId),
        decisionEmailSentAt: a.decisionEmailSentAt ? a.decisionEmailSentAt.toISOString() : null,
        decisionEmailSendError: a.decisionEmailSendError,
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
