import { prisma } from "@/lib/db/prisma";
import { awardRep, REP_TABLE } from "./rep-engine";

const ACTIVE_AFTER_DAYS = 30;
const REP_ELIGIBLE_AFTER_DAYS = 90;
// ARCHITECTURE.md §5 specifies +10 Trust Score for the 30-day
// joined→active transition. It doesn't separately specify how much this
// should move Referral.impactScore — reusing the same +10 magnitude is
// this session's documented bridging choice, not a distinct spec value.
// This mechanic is independent of REP (see ADR-0015): it moves Trust
// Score, not REP.
const ACTIVE_TRUST_BONUS = 10;
const ACTIVE_IMPACT_BONUS = 10;

/**
 * Promotes an inviter's `joined` referrals to `active` once the invitee
 * has been a member for 30+ days (ARCHITECTURE.md §5), granting the
 * inviter +10 Trust Score. No real cron/background job exists yet — this
 * is called opportunistically wherever the inviter's own data is loaded
 * (currently: the Hall page). Naturally idempotent: once a referral's
 * status leaves `joined`, this query no longer matches it, so a referral
 * can't be double-credited by being checked repeatedly.
 */
export async function syncReferralLifecycle(inviterId: string) {
  const cutoff = new Date(Date.now() - ACTIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const dueReferrals = await prisma.referral.findMany({
    where: {
      inviterId,
      status: "joined",
      invited: { joinedAt: { lte: cutoff } },
    },
  });

  if (dueReferrals.length > 0) {
    await prisma.$transaction([
      prisma.referral.updateMany({
        where: { id: { in: dueReferrals.map((r) => r.id) } },
        data: { status: "active", impactScore: { increment: ACTIVE_IMPACT_BONUS } },
      }),
      prisma.user.update({
        where: { id: inviterId },
        data: { trustScore: { increment: dueReferrals.length * ACTIVE_TRUST_BONUS } },
      }),
    ]);
  }

  await checkInviteeActive90Days(inviterId);
}

/**
 * CLAUDE.md's (2026-07-05) "Invitee active 90 days" REP bonus (+1000) —
 * a separate milestone from the 30-day Trust Score flip above. Tracked
 * via a `RepHistory` row per referral (keyed by `source`) rather than a
 * new schema field, so it can't double-award.
 */
async function checkInviteeActive90Days(inviterId: string) {
  const cutoff = new Date(Date.now() - REP_ELIGIBLE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const eligible = await prisma.referral.findMany({
    where: {
      inviterId,
      status: { in: ["active", "joined"] },
      invited: { joinedAt: { lte: cutoff } },
    },
    select: { id: true },
  });

  for (const referral of eligible) {
    const source = `referral-active-90d:${referral.id}`;
    const alreadyGranted = await prisma.repHistory.findFirst({ where: { userId: inviterId, source } });
    if (alreadyGranted) continue;

    await awardRep(inviterId, REP_TABLE.earn.inviteeActive90Days.points, "Invitee active 90 days", source);
  }
}
