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
// Step 4 (2026-09-11): Zone 2 (People) full depth. Research ahead of
// this step found the audit-log model "attribution" needs already
// exists (ModerationAction, written by logModerationAction() since
// Gap 4) -- no new model needed, same conclusion as Zone 1's consent
// question. LegalConsent, unlike Waitlist's fields, genuinely IS an
// append-only history for a real User row (one row per consent EVENT,
// per its own schema comment) -- shown here as real history, not
// current-state-only like Zone 1 had to settle for. RepHistory is
// shown unconditionally here regardless of REP_UI_ENABLED -- that flag
// gates a v1 *member-facing* display decision, not access control, and
// an admin console isn't the v1 surface it was written for. Reuses the
// existing PATCH /api/admin/members/[id] action route unchanged for
// the ageVerified toggle (components/shared/MembersAgeVerification.tsx
// had this logic already, same orphaned-since-the-fold shape as
// ApplicationsQueue.tsx was for Zone 1). No ban/promote/role/
// inviteAllowance actions -- none of those endpoints exist yet, and
// none were asked for; not invented here. "Notes" stays out entirely,
// per the original build order's own separate later step for it.
//
// Full per-zone depth for Arbitration/Invitations is still built out
// in the steps that follow, per the specified order. Same
// notFound()-not-redirect pattern as every other admin page.
export default async function AdminConsolePage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [applications, peopleBase, reports, tokens, counts] = await Promise.all([
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
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        rep: true,
        level: true,
        trustScore: true,
        reputation: true,
        ageVerified: true,
        ageVerifiedAt: true,
        joinedAt: true,
        invitedById: true,
        partnerId: true,
      },
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

  const peopleIds = peopleBase.map((p) => p.id);

  // Zone 2's batch: one query per concern across every listed member,
  // not one query per member — the same shape as the counts block
  // above, just at row-detail scale instead of dashboard-stat scale.
  const [postCounts, commentCounts, invitees, repHistoryRows, consentRows, adminActionRows] = await Promise.all([
    prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: peopleIds }, isPublished: true },
      _count: { _all: true },
    }),
    prisma.comment.groupBy({
      by: ["authorId"],
      where: { authorId: { in: peopleIds }, isDeleted: false },
      _count: { _all: true },
    }),
    prisma.user.findMany({
      where: { invitedById: { in: peopleIds } },
      select: { invitedById: true, displayName: true },
    }),
    prisma.repHistory.findMany({
      where: { userId: { in: peopleIds } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.legalConsent.findMany({
      where: { userId: { in: peopleIds } },
      orderBy: { acceptedAt: "desc" },
    }),
    prisma.moderationAction.findMany({
      where: { targetType: "user", targetId: { in: peopleIds } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const postCountById = new Map(postCounts.map((r) => [r.authorId, r._count._all]));
  const commentCountById = new Map(commentCounts.map((r) => [r.authorId, r._count._all]));
  const inviteesById = new Map<string, string[]>();
  for (const inv of invitees) {
    if (!inv.invitedById) continue;
    const list = inviteesById.get(inv.invitedById) ?? [];
    list.push(inv.displayName);
    inviteesById.set(inv.invitedById, list);
  }
  const repHistoryById = new Map<string, typeof repHistoryRows>();
  for (const r of repHistoryRows) {
    const list = repHistoryById.get(r.userId) ?? [];
    list.push(r);
    repHistoryById.set(r.userId, list);
  }
  const consentsById = new Map<string, typeof consentRows>();
  for (const c of consentRows) {
    const list = consentsById.get(c.userId) ?? [];
    list.push(c);
    consentsById.set(c.userId, list);
  }
  const adminActionsByTarget = new Map<string, typeof adminActionRows>();
  for (const m of adminActionRows) {
    if (!m.targetId) continue;
    const list = adminActionsByTarget.get(m.targetId) ?? [];
    list.push(m);
    adminActionsByTarget.set(m.targetId, list);
  }

  // reviewedBy (Waitlist), invitedById/partnerId (User), and adminId
  // (ModerationAction) are all raw User.id fields, not Prisma relations
  // (see schema comments) — resolved together in one shared name-lookup
  // query rather than one per concern, since in practice it's usually
  // the same handful of accounts either way.
  const nameLookupIds = Array.from(
    new Set(
      [
        ...applications.map((a) => a.reviewedBy),
        ...peopleBase.map((p) => p.invitedById),
        ...peopleBase.map((p) => p.partnerId),
        ...adminActionRows.map((m) => m.adminId),
      ].filter((id): id is string => Boolean(id)),
    ),
  );
  const nameLookupRows = nameLookupIds.length
    ? await prisma.user.findMany({ where: { id: { in: nameLookupIds } }, select: { id: true, displayName: true } })
    : [];
  const nameById = new Map(nameLookupRows.map((r) => [r.id, r.displayName]));

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
        reviewerName: a.reviewedBy ? (nameById.get(a.reviewedBy) ?? null) : null,
        ageVerified: a.ageVerified,
        ageVerifiedAt: a.ageVerifiedAt ? a.ageVerifiedAt.toISOString() : null,
        hasToken: Boolean(a.applicationTokenId),
        decisionEmailSentAt: a.decisionEmailSentAt ? a.decisionEmailSentAt.toISOString() : null,
        decisionEmailSendError: a.decisionEmailSendError,
      }))}
      people={peopleBase.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        username: p.username,
        email: p.email,
        rep: p.rep,
        level: p.level,
        trustScore: p.trustScore,
        reputation: Number(p.reputation),
        ageVerified: p.ageVerified,
        ageVerifiedAt: p.ageVerifiedAt ? p.ageVerifiedAt.toISOString() : null,
        joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
        postCount: postCountById.get(p.id) ?? 0,
        commentCount: commentCountById.get(p.id) ?? 0,
        invitedByName: p.invitedById ? (nameById.get(p.invitedById) ?? null) : null,
        inviteeNames: inviteesById.get(p.id) ?? [],
        partnerName: p.partnerId ? (nameById.get(p.partnerId) ?? null) : null,
        repHistory: (repHistoryById.get(p.id) ?? []).map((r) => ({
          id: r.id,
          delta: r.delta,
          reason: r.reason,
          source: r.source,
          createdAt: r.createdAt.toISOString(),
        })),
        consents: (consentsById.get(p.id) ?? []).map((c) => ({
          id: c.id,
          termsVersion: c.termsVersion,
          privacyVersion: c.privacyVersion,
          aupVersion: c.aupVersion,
          acceptedAt: c.acceptedAt.toISOString(),
          acceptedIp: c.acceptedIp,
        })),
        adminActions: (adminActionsByTarget.get(p.id) ?? []).map((m) => ({
          id: m.id,
          action: m.action,
          note: m.note,
          createdAt: m.createdAt.toISOString(),
          adminName: nameById.get(m.adminId) ?? null,
        })),
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
