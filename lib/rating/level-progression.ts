import { prisma } from "@/lib/db/prisma";
import { grantAchievement } from "@/lib/utils/achievements";
import { awardRep, REP_TABLE } from "./rep-engine";
import { LEVEL_NAMES } from "./levels";

// PRODUCT.md §2's Level I→II/II→III requirements include criteria with no
// trackable metric anywhere in the source docs ("steady activity" / "high
// activity" — see lib/rating/level-progress.ts). Auto-promotion can only
// gate on the criteria that ARE real: reputation, referral count, and
// (for II→III) has-published-content. This is a known gap, not silently
// dropped — see TECH_DEBT.md.
const LEVEL_2_MIN_REPUTATION = 2;
const LEVEL_3_MIN_REPUTATION = 3;

/**
 * Checks whether a member has met the (mechanically real) criteria for
 * their next level and promotes them if so. No real cron/background job
 * exists yet — called opportunistically wherever the member's own data is
 * loaded (currently: the Hall page), same pattern as
 * `syncReferralLifecycle`. Levels IV+ (Warden/Master/Council) are manual
 * appointments per PRODUCT.md §2 — this never touches them.
 */
export async function checkLevelUp(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const reputation = Number(user.reputation);

  if (user.level === 1) {
    if (reputation >= LEVEL_2_MIN_REPUTATION && user.referralCount >= 1) {
      await promote(userId, 2, `Reached Level II: ${LEVEL_NAMES[2]}`);
    }
    return;
  }

  if (user.level === 2) {
    const publishedCount = await prisma.post.count({ where: { authorId: userId, isPublished: true } });
    if (reputation >= LEVEL_3_MIN_REPUTATION && publishedCount >= 1) {
      await promote(userId, 3, `Reached Level III: ${LEVEL_NAMES[3]}`);
    }
  }
}

async function promote(userId: string, newLevel: 2 | 3, notificationTitle: string) {
  const user = await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });

  await prisma.notification.create({
    data: {
      userId,
      type: "level_up",
      title: notificationTitle,
      body: "Your standing in the Club has grown.",
    },
  });

  await grantAchievement(userId, newLevel === 2 ? "level-up-2" : "level-up-3");

  // CLAUDE.md (2026-07-05): "Invitee reached Level II" — +500 REP to the
  // inviter, not the promoted member themselves.
  if (newLevel === 2 && user.invitedById) {
    await awardRep(
      user.invitedById,
      REP_TABLE.earn.inviteeReachedLevel2.points,
      "Your invitee reached Level II",
      `invitee-level-2:${userId}`,
    );
  }
}
