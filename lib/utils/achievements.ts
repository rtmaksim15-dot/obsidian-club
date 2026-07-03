import { prisma } from "@/lib/db/prisma";

/**
 * Achievement definitions this app actually grants, keyed by slug.
 * Content per PRODUCT.md §7 "Личные достижения" — not invented.
 */
const DEFINITIONS = {
  "initiation-complete": {
    name: "Прошёл Ритуал Инициации",
    description: "Completed the Initiation Ritual.",
    category: "personal" as const,
    ratingBonus: 0,
  },
};

/** Grants an achievement, creating its definition row on first use.
 *  Safe to call repeatedly — no-ops if the member already has it. */
export async function grantAchievement(userId: string, slug: keyof typeof DEFINITIONS) {
  const def = DEFINITIONS[slug];

  const achievement = await prisma.achievement.upsert({
    where: { slug },
    create: { slug, ...def },
    update: {},
  });

  await prisma.userAchievement.upsert({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
    create: { userId, achievementId: achievement.id },
    update: {},
  });
}
