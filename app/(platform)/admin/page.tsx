import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db/prisma";
import { evaluateTokenLifecycle } from "@/lib/invites/lifecycle";
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
// Step 5 (2026-09-11): Zone 3 (Arbitration) full depth. Reuses the
// existing PATCH /api/admin/reports/[id] action route unchanged
// (dismiss/review/preserve/remove) -- components/shared/ReportsQueue.tsx
// had this logic already, same orphaned-since-the-fold shape as the
// other zones' predecessors. Report.targetId is a bare polymorphic uuid
// with no Prisma relation (confirmed against the schema, same shape
// Waitlist.reviewedBy already had) -- resolving it to actual reported
// content requires the manual per-targetType batched lookup the
// pre-fold admin/reports/page.tsx already did (recovered from git
// history), extended here with the target's author and enough context
// (parent post for a comment, room for a message) to build a one-click
// link where the target's own visibility rules make that reliable.
// Notably, Post has no admin bypass on its own detail route and no
// soft-delete field (only isPreserved) -- once a red-line report is
// preserved, /posts/[id] 404s for the admin same as anyone, so the
// panel carries its own copy of the content rather than depending on
// the link. "Full history" turned out to have three independent, real
// meanings, none pre-built: other open/resolved reports against the
// same exact target (self-joins on the existing
// @@index([targetType, targetId])), every ModerationAction ever logged
// against that target (the action route already writes these with
// targetType/targetId = the report's own target, not "report" --
// same read Zone 2 already does for targetType "user"), and the
// reporter's own filing history (a fresh groupBy, no existing query
// did this). All three are shown, clearly labeled, rather than
// guessing at one. The confirm-dialog-before-PATCH pattern from every
// other zone's actions is kept -- "one-click" reads as direct context
// links, not skipping confirmation, matching every existing precedent.
//
// Step 6 (2026-09-11): Zone 4 (Invitations) full depth, plus a direct
// requirement given mid-build: an admin can issue an invitation
// straight to an email address, bypassing the applications queue
// entirely (POST /api/admin/invites/personal) -- no public form, no
// separate Accept step. That needed one real schema change: a new
// InviteSource value, "personal_invitation" (prisma db push'd against
// production, npm run check:rls re-run clean after -- see CLAUDE.md
// rule 8). /api/join/[token]/route.ts needed no change: every source
// branch there is a positive `=== "member"` / `=== "partner"` check,
// so the new value already falls through exactly like purchase_card/
// application do today. Send-failure for this path (and for resending
// any token that has an email on file) is tracked on InviteToken's own
// sentToEmail/sentToName/emailSentAt/emailSendError columns -- not
// Waitlist's decisionEmailSendError, since a personally-issued invite
// has no Waitlist row to hold that; these columns already existed
// (labeled "email-channel batches only" but not actually restricted to
// them) and are exactly the right place regardless.
//
// InviteTokenStatus's "expired" value is never actually written by
// anything in this codebase (confirmed: no cron/sweep exists) -- real
// expiry is computed live via evaluateTokenLifecycle() (already shared
// by /join/[token] and the arm route), so "issued/redeemed/expired" is
// bucketed here at read time, not read off the stale `status` column.
// "Failed-sends-first" sorts the fetched list before mapping. Reuses
// the existing arm/revoke routes unchanged; a new resend route
// (POST /api/admin/invite-tokens/[id]/resend) mirrors the applications
// flow's "resend never re-mints" rule and is only legal when
// `sentToEmail` is set -- which already excludes member/partner tokens
// (plain links, no email flow -- "display-only" per the original spec)
// and application-sourced tokens (resent via their own existing route)
// with no extra guard needed.
//
// Step 7 (2026-09-11): Notes model + RLS -- the one new model the
// original Part B task pre-approved, scoped to Zone 2 (People), where
// "notes" was actually named. AdminNote is append-only, same shape as
// RepHistory/LegalConsent/ModerationAction -- a running log, not an
// editable field. New table needed RLS enabling by hand after
// `prisma db push` (same two-step dance check-rls.ts/CLAUDE.md rule 8
// describes for every table this project has ever added): pushed,
// check:rls caught it disabled, `alter table admin_notes enable row
// level security` run directly, check:rls re-run clean, then the SQL
// saved to supabase/migrations/ as a record, matching every other
// admin-only table's deny-all pattern (only ever read/written via
// Prisma from POST /api/admin/members/[id]/notes, never a browser-side
// Supabase client).
export default async function AdminConsolePage() {
  const admin = await requireAdmin();
  if (!admin) {
    notFound();
  }

  const [applications, peopleBase, reports, tokensRaw, counts] = await Promise.all([
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
      // Red-line categories (underage/non_consensual/threat) first,
      // oldest-first within each group — matches the pre-fold
      // admin/reports/page.tsx's own ordering (git history), lost when
      // Step 1 first stood up this zone as a bare minimal list.
      orderBy: [{ isRedLine: "desc" }, { createdAt: "asc" }],
      take: 50,
      include: {
        reporter: {
          select: { id: true, displayName: true, username: true, level: true, trustScore: true, ageVerified: true, joinedAt: true },
        },
      },
    }),
    prisma.inviteToken.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        source: true,
        status: true,
        createdAt: true,
        validUntil: true,
        clientWindowDays: true,
        firstScannedAt: true,
        clientExpiresAt: true,
        revokedAt: true,
        redeemedAt: true,
        redeemedById: true,
        inviterId: true,
        partnerOfId: true,
        sentToEmail: true,
        sentToName: true,
        emailSentAt: true,
        emailSendError: true,
      },
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
  const [postCounts, commentCounts, invitees, repHistoryRows, consentRows, adminActionRows, adminNoteRows] = await Promise.all([
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
    prisma.adminNote.findMany({
      where: { memberId: { in: peopleIds } },
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
  const adminNotesByMember = new Map<string, typeof adminNoteRows>();
  for (const n of adminNoteRows) {
    const list = adminNotesByMember.get(n.memberId) ?? [];
    list.push(n);
    adminNotesByMember.set(n.memberId, list);
  }

  // Zone 3's batch: targetId has no Prisma relation (bare polymorphic
  // uuid, same shape Waitlist.reviewedBy already had), so the reported
  // content is resolved per targetType, batched across every open
  // report rather than one query per report.
  const postTargetIds = reports.filter((r) => r.targetType === "post").map((r) => r.targetId);
  const commentTargetIds = reports.filter((r) => r.targetType === "comment").map((r) => r.targetId);
  const messageTargetIds = reports.filter((r) => r.targetType === "message").map((r) => r.targetId);
  const profileTargetIds = reports.filter((r) => r.targetType === "profile").map((r) => r.targetId);
  const reportTargetPairs = reports.map((r) => ({ targetType: r.targetType, targetId: r.targetId }));

  const [targetPosts, targetComments, targetMessages, targetProfiles, siblingReports, targetModerationActions] =
    await Promise.all([
      postTargetIds.length
        ? prisma.post.findMany({
            where: { id: { in: postTargetIds } },
            select: {
              id: true,
              title: true,
              content: true,
              isPublished: true,
              isPreserved: true,
              createdAt: true,
              author: { select: { id: true, displayName: true, username: true, level: true, trustScore: true, ageVerified: true } },
            },
          })
        : Promise.resolve([]),
      commentTargetIds.length
        ? prisma.comment.findMany({
            where: { id: { in: commentTargetIds } },
            select: {
              id: true,
              content: true,
              isDeleted: true,
              createdAt: true,
              postId: true,
              post: { select: { id: true, title: true, isPublished: true } },
              author: { select: { id: true, displayName: true, username: true, level: true, trustScore: true, ageVerified: true } },
            },
          })
        : Promise.resolve([]),
      messageTargetIds.length
        ? prisma.message.findMany({
            where: { id: { in: messageTargetIds } },
            select: {
              id: true,
              content: true,
              isDeleted: true,
              createdAt: true,
              room: { select: { id: true, slug: true, name: true } },
              user: { select: { id: true, displayName: true, username: true, level: true, trustScore: true, ageVerified: true } },
            },
          })
        : Promise.resolve([]),
      profileTargetIds.length
        ? prisma.user.findMany({
            where: { id: { in: profileTargetIds } },
            select: { id: true, displayName: true, username: true, level: true, trustScore: true, ageVerified: true, joinedAt: true },
          })
        : Promise.resolve([]),
      // (a) other reports (any status) against the exact same target —
      // uses the existing @@index([targetType, targetId]); excluded per
      // report by id below, not in the query itself (an OR of every
      // listed report's target, one query total).
      reportTargetPairs.length
        ? prisma.report.findMany({
            where: { OR: reportTargetPairs },
            select: { id: true, targetType: true, targetId: true, status: true, category: true, createdAt: true },
          })
        : Promise.resolve([]),
      // (b) every ModerationAction ever logged against these exact
      // targets — the action route always logs targetType/targetId as
      // the report's own target, never "report" itself, so this is real
      // admin-activity history, not just this report's own resolution.
      reportTargetPairs.length
        ? prisma.moderationAction.findMany({
            where: { OR: reportTargetPairs.map((t) => ({ targetType: t.targetType, targetId: t.targetId })) },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

  const postById = new Map(targetPosts.map((p) => [p.id, p]));
  const commentById = new Map(targetComments.map((c) => [c.id, c]));
  const messageById = new Map(targetMessages.map((m) => [m.id, m]));
  const profileById = new Map(targetProfiles.map((u) => [u.id, u]));

  const targetKey = (t: string, id: string) => `${t}:${id}`;
  const siblingReportsByTarget = new Map<string, typeof siblingReports>();
  for (const s of siblingReports) {
    const key = targetKey(s.targetType, s.targetId);
    const list = siblingReportsByTarget.get(key) ?? [];
    list.push(s);
    siblingReportsByTarget.set(key, list);
  }
  const targetActionsByTarget = new Map<string, typeof targetModerationActions>();
  for (const m of targetModerationActions) {
    if (!m.targetType || !m.targetId) continue;
    const key = targetKey(m.targetType, m.targetId);
    const list = targetActionsByTarget.get(key) ?? [];
    list.push(m);
    targetActionsByTarget.set(key, list);
  }

  // (c) the reporter's own filing history — how many reports they've
  // filed, broken down by outcome. No existing query did this.
  const reporterIds = Array.from(new Set(reports.map((r) => r.reporterId)));
  const reporterFilingRows = reporterIds.length
    ? await prisma.report.groupBy({ by: ["reporterId", "status"], where: { reporterId: { in: reporterIds } }, _count: { _all: true } })
    : [];
  const filingStatsByReporter = new Map<string, { open: number; reviewed: number; dismissed: number }>();
  for (const row of reporterFilingRows) {
    const stats = filingStatsByReporter.get(row.reporterId) ?? { open: 0, reviewed: 0, dismissed: 0 };
    stats[row.status as "open" | "reviewed" | "dismissed"] = row._count._all;
    filingStatsByReporter.set(row.reporterId, stats);
  }

  // Zone 4: bucket each token's real, live lifecycle state (never the
  // possibly-stale `status` column — nothing in this codebase ever
  // writes InviteTokenStatus.expired) and sort failed sends to the
  // front, per instruction.
  const now = new Date();
  const tokens = [...tokensRaw].sort((a, b) => {
    const aFailed = Boolean(a.sentToEmail) && !a.emailSentAt;
    const bFailed = Boolean(b.sentToEmail) && !b.emailSentAt;
    if (aFailed !== bFailed) return aFailed ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // reviewedBy (Waitlist), invitedById/partnerId (User), adminId
  // (ModerationAction, Zones 2/3), and redeemedById/inviterId/
  // partnerOfId (InviteToken, Zone 4) are all raw User.id fields, not
  // Prisma relations (see schema comments) — resolved together in one
  // shared name-lookup query rather than one per concern, since in
  // practice it's usually the same handful of accounts either way.
  const nameLookupIds = Array.from(
    new Set(
      [
        ...applications.map((a) => a.reviewedBy),
        ...peopleBase.map((p) => p.invitedById),
        ...peopleBase.map((p) => p.partnerId),
        ...adminActionRows.map((m) => m.adminId),
        ...adminNoteRows.map((n) => n.authorId),
        ...reports.map((r) => r.reviewedById),
        ...targetModerationActions.map((m) => m.adminId),
        ...tokens.map((t) => t.redeemedById),
        ...tokens.map((t) => t.inviterId),
        ...tokens.map((t) => t.partnerOfId),
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
        notes: (adminNotesByMember.get(p.id) ?? []).map((n) => ({
          id: n.id,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
          authorName: nameById.get(n.authorId) ?? null,
        })),
      }))}
      reports={reports.map((r) => {
        let label: string;
        let authorId: string | null = null;
        let authorName: string | null = null;
        let authorUsername: string | null = null;
        let isDeleted = false;
        let isPreserved = false;
        let contextHref: string | null = null;

        if (r.targetType === "post") {
          const post = postById.get(r.targetId);
          if (!post) {
            label = "[post no longer exists]";
          } else {
            label = post.title || post.content || "(no content)";
            authorId = post.author.id;
            authorName = post.author.displayName;
            authorUsername = post.author.username;
            isPreserved = post.isPreserved;
            // Post has no admin bypass and no soft-delete field — once
            // unpublished (preserve does this) the link 404s for the
            // admin same as anyone, so it's only offered while still
            // publicly reachable.
            contextHref = post.isPublished ? `/posts/${post.id}` : null;
          }
        } else if (r.targetType === "comment") {
          const comment = commentById.get(r.targetId);
          if (!comment) {
            label = "[comment no longer exists]";
          } else {
            label = comment.isDeleted ? "[comment already removed]" : comment.content;
            authorId = comment.author.id;
            authorName = comment.author.displayName;
            authorUsername = comment.author.username;
            isDeleted = comment.isDeleted;
            contextHref = comment.post?.isPublished ? `/posts/${comment.post.id}` : null;
          }
        } else if (r.targetType === "message") {
          const message = messageById.get(r.targetId);
          if (!message) {
            label = "[message no longer exists]";
          } else {
            label = message.isDeleted ? "[message already removed]" : message.content;
            authorId = message.user.id;
            authorName = message.user.displayName;
            authorUsername = message.user.username;
            isDeleted = message.isDeleted;
            // Admins bypass canAccessRoom entirely, so the room itself
            // is always reachable — but RoomPage only ever loads the
            // most recent 50 messages with no scroll-to/anchor, so an
            // older message in an active room may not actually be
            // visible there. Linked anyway; it's still often useful.
            contextHref = `/rooms/${message.room.slug}`;
          }
        } else {
          const profile = profileById.get(r.targetId);
          if (!profile) {
            label = "[member no longer exists]";
          } else {
            label = profile.displayName;
            authorId = profile.id;
            authorName = profile.displayName;
            authorUsername = profile.username;
            contextHref = `/profile/${profile.username}`;
          }
        }

        const key = targetKey(r.targetType, r.targetId);
        const filingStats = filingStatsByReporter.get(r.reporterId) ?? { open: 0, reviewed: 0, dismissed: 0 };

        return {
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          category: r.category,
          isRedLine: r.isRedLine,
          note: r.note,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
          reviewerName: r.reviewedById ? (nameById.get(r.reviewedById) ?? null) : null,
          reporter: {
            id: r.reporter.id,
            displayName: r.reporter.displayName,
            username: r.reporter.username,
            level: r.reporter.level,
            trustScore: r.reporter.trustScore,
            ageVerified: r.reporter.ageVerified,
            joinedAt: r.reporter.joinedAt ? r.reporter.joinedAt.toISOString() : null,
            reportsFiled: filingStats.open + filingStats.reviewed + filingStats.dismissed,
            reportsDismissed: filingStats.dismissed,
          },
          target: {
            label,
            authorId,
            authorName,
            authorUsername,
            isDeleted,
            isPreserved,
            contextHref,
          },
          siblingReports: (siblingReportsByTarget.get(key) ?? [])
            .filter((s) => s.id !== r.id)
            .map((s) => ({ id: s.id, status: s.status, category: s.category, createdAt: s.createdAt.toISOString() })),
          targetModerationActions: (targetActionsByTarget.get(key) ?? []).map((m) => ({
            id: m.id,
            action: m.action,
            note: m.note,
            createdAt: m.createdAt.toISOString(),
            adminName: nameById.get(m.adminId) ?? null,
          })),
        };
      })}
      tokens={tokens.map((t) => {
        const lifecycle = evaluateTokenLifecycle(t, now);
        const bucket: "redeemed" | "revoked" | "expired" | "issued" = t.redeemedAt
          ? "redeemed"
          : t.revokedAt
            ? "revoked"
            : !lifecycle.ok
              ? "expired"
              : "issued";
        return {
          id: t.id,
          source: t.source,
          status: t.status,
          bucket,
          createdAt: t.createdAt.toISOString(),
          validUntil: t.validUntil ? t.validUntil.toISOString() : null,
          revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
          redeemedAt: t.redeemedAt ? t.redeemedAt.toISOString() : null,
          redeemedByName: t.redeemedById ? (nameById.get(t.redeemedById) ?? null) : null,
          inviterName: t.inviterId ? (nameById.get(t.inviterId) ?? null) : null,
          partnerOfName: t.partnerOfId ? (nameById.get(t.partnerOfId) ?? null) : null,
          sentToEmail: t.sentToEmail,
          sentToName: t.sentToName,
          emailSentAt: t.emailSentAt ? t.emailSentAt.toISOString() : null,
          emailSendError: t.emailSendError,
        };
      })}
    />
  );
}
