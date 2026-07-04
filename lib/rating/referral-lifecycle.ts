import { prisma } from "@/lib/db/prisma";
import { recalculateRating } from "./rating-engine";

const ACTIVE_AFTER_DAYS = 30;
// ARCHITECTURE.md §5 specifies +10 Trust Score for the transition.
// It doesn't separately specify how much this should move
// referral_quality's rating component — reusing the same +10 magnitude
// for Referral.impactScore is this session's documented bridging choice
// between the two systems, not a distinct spec value.
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

  if (dueReferrals.length === 0) return;

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

  await recalculateRating(inviterId, `${dueReferrals.length} referral(s) became active`, "referral");
}
