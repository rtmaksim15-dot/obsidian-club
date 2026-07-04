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
  "level-up-2": {
    name: "Поднялся с Уровня I до II",
    description: "Promoted from Initiate to Member.",
    category: "personal" as const,
    ratingBonus: 0,
  },
  "level-up-3": {
    name: "Поднялся с Уровня II до III",
    description: "Promoted from Member to Senior Member.",
    category: "personal" as const,
    ratingBonus: 0,
  },
  "first-reputation-star": {
    name: "Первая звезда репутации",
    description: "Received your first review.",
    category: "personal" as const,
    ratingBonus: 0,
  },
  "first-post": {
    name: "Создал первый материал",
    description: "Published your first piece of content.",
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
