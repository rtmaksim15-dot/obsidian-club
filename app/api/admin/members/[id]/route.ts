import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { logModerationAction } from "@/lib/moderation/log";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";
import { resolveAvatarUrls } from "@/lib/storage/resolve-media";
import { mergeBroughtIn, resolveBondsForPerson } from "@/lib/admin/linked-accounts";

type Body = { ageVerified?: boolean; removeAvatar?: boolean; removeAvatarReason?: string; isTest?: boolean };

// GET /api/admin/members/:id (2026-11-22, see DECISIONS.md) — the
// single-row counterpart to admin/page.tsx's bulk members fetch, for
// the admin search feature: a search result can match a member
// outside the console's own top-50-most-recent default load, so
// AdminConsole fetches it here on demand. Returns the exact same
// Person shape admin/page.tsx builds, resolved via direct relations
// (invitedBy/invitees/partner/partnerOf, repHistory, legalConsents)
// instead of that file's batched-across-many-rows approach — correct
// for exactly one row, not a reimplementation of the batching.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const p = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      invitedBy: { select: { displayName: true } },
      invitees: { select: { id: true, displayName: true } },
      partner: { select: { displayName: true } },
      partnerOf: { select: { displayName: true } },
      ageVerifications: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { ageVerifications: true } },
      repHistory: { orderBy: { createdAt: "desc" } },
      legalConsents: { orderBy: { acceptedAt: "desc" } },
      adminNotesAboutMe: { orderBy: { createdAt: "desc" }, include: { author: { select: { displayName: true } } } },
    },
  });
  if (!p) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const [postCount, commentCount, moderationActionRows, [avatarUrl], sponsoredApplicantRows, bondRows] = await Promise.all([
    prisma.post.count({ where: { authorId: p.id, isPublished: true } }),
    prisma.comment.count({ where: { authorId: p.id, isDeleted: false } }),
    prisma.moderationAction.findMany({
      where: { targetType: "user", targetId: p.id },
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { displayName: true } } },
    }),
    resolveAvatarUrls([p.avatarUrl]),
    // Linked accounts (2026-11-22, see DECISIONS.md) — applicants who
    // used this member's sponsor code but haven't registered yet.
    prisma.waitlist.findMany({
      where: { invitedBy: p.id },
      select: { id: true, name: true, email: true, status: true },
    }),
    prisma.bond.findMany({
      where: { OR: [{ fromUserId: p.id }, { toUserId: p.id }] },
      select: {
        id: true,
        kind: true,
        status: true,
        fromUserId: true,
        toUserId: true,
        fromUser: { select: { displayName: true } },
        toUser: { select: { displayName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    person: {
      id: p.id,
      displayName: p.displayName,
      username: p.username,
      email: p.email,
      avatarUrl,
      rep: p.rep,
      level: p.level,
      trustScore: p.trustScore,
      reputation: Number(p.reputation),
      ageVerified: p.ageVerified,
      ageVerifiedAt: p.ageVerifiedAt ? p.ageVerifiedAt.toISOString() : null,
      isTest: p.isTest,
      ageVerificationProvider: p.ageVerifications[0]?.provider ?? null,
      ageVerificationMethod: p.ageVerifications[0]?.method ?? null,
      ageVerificationAttempts: p._count.ageVerifications,
      ageVerificationLastAt: p.ageVerifications[0] ? p.ageVerifications[0].createdAt.toISOString() : null,
      joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
      postCount,
      commentCount,
      invitedById: p.invitedById,
      invitedByName: p.invitedBy?.displayName ?? null,
      partnerId: p.partnerId,
      partnerName: p.partner?.displayName ?? p.partnerOf?.displayName ?? null,
      broughtIn: mergeBroughtIn(
        p.invitees,
        sponsoredApplicantRows.map((w) => ({ id: w.id, displayName: w.name || w.email, status: w.status })),
      ),
      bonds: resolveBondsForPerson(
        p.id,
        bondRows.map((b) => ({
          id: b.id,
          kind: b.kind,
          status: b.status,
          fromUserId: b.fromUserId,
          toUserId: b.toUserId,
          fromUserName: b.fromUser.displayName,
          toUserName: b.toUser.displayName,
        })),
      ),
      repHistory: p.repHistory.map((r) => ({
        id: r.id,
        delta: r.delta,
        reason: r.reason,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      })),
      consents: p.legalConsents.map((c) => ({
        id: c.id,
        termsVersion: c.termsVersion,
        privacyVersion: c.privacyVersion,
        aupVersion: c.aupVersion,
        dmRulesVersion: c.dmRulesVersion,
        acceptedAt: c.acceptedAt.toISOString(),
        acceptedIp: c.acceptedIp,
      })),
      adminActions: moderationActionRows.map((m) => ({
        id: m.id,
        action: m.action,
        note: m.note,
        createdAt: m.createdAt.toISOString(),
        adminName: m.admin?.displayName ?? m.actorLabel ?? null,
      })),
      notes: p.adminNotesAboutMe.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        authorName: n.author.displayName,
      })),
    },
  });
}

// PATCH /api/admin/members/:id — toggle Age Verification on an existing
// member (2026-08-03). Field first, no enforcement gate yet — see
// DECISIONS.md. Separate from the approval-time checkbox in
// app/api/admin/applications/[id]/route.ts, which stages the same flag
// on Waitlist for members who haven't redeemed their invite yet.
//
// Moderation gap 4 (2026-09-08, see DECISIONS.md): every toggle, both
// directions, now writes a ModerationAction with the previous and new
// value — this is the launch cohort's only age control and was
// previously unattributed (the bare overwrite left no record of who
// changed it or from what). The User row itself still only holds the
// current state (ageVerified/ageVerifiedAt) by design; ModerationAction
// is the append-only history — never overwritten, so a prior toggle's
// record survives every later one.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }
  const admin = adminResult.user;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  // Profile lite, B7 (Package 4, Phase B, 2026-10-13, see DECISIONS.md)
  // — a second, distinct action on this same route: soft-removes an
  // explicit avatar (sets avatarUrl null; the original file in Storage
  // is untouched — same "don't hard-delete" posture as every other
  // moderation action in this app). A reason is required so the
  // ModerationAction row actually explains itself later.
  if (body.removeAvatar === true) {
    const reason = body.removeAvatarReason?.trim();
    if (!reason) {
      return NextResponse.json({ error: "A reason is required." }, { status: 422 });
    }
    await prisma.user.update({ where: { id: params.id }, data: { avatarUrl: null } });
    await logModerationAction({
      adminId: admin.id,
      action: "member.avatar_removed",
      targetType: "user",
      targetId: member.id,
      note: reason,
    });
    return NextResponse.json({ ok: true });
  }

  // Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
  // a third, distinct action: marks/unmarks a "Test account." Never
  // deletes or alters anything else about the account — it only flips
  // this one flag, which every non-admin-facing query then uses to
  // exclude the account (and everything it authored) from its results.
  if (typeof body.isTest === "boolean") {
    await prisma.user.update({ where: { id: params.id }, data: { isTest: body.isTest } });
    await logModerationAction({
      adminId: admin.id,
      action: "member.is_test_changed",
      targetType: "user",
      targetId: member.id,
      note: `isTest: ${member.isTest} -> ${body.isTest}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (typeof body.ageVerified !== "boolean") {
    return NextResponse.json({ error: "ageVerified must be a boolean." }, { status: 422 });
  }

  const previousValue = member.ageVerified;

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ageVerified: body.ageVerified,
      ageVerifiedAt: body.ageVerified ? new Date() : null,
      ageVerifiedThreshold: body.ageVerified ? MIN_MEMBER_AGE : null,
    },
  });

  await logModerationAction({
    adminId: admin.id,
    action: "member.age_verified_changed",
    targetType: "user",
    targetId: member.id,
    note: `ageVerified: ${previousValue} -> ${body.ageVerified}`,
  });

  return NextResponse.json({ ok: true });
}
