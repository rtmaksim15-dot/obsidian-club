import { prisma } from "@/lib/db/prisma";

/**
 * Achievement definitions this app actually grants, keyed by slug.
 * Content per PRODUCT.md §7 "Личные достижения" — not invented. As of
 * ADR-0015 (2026-07-05), achievements no longer carry their own REP
 * bonus — REP is earned directly from the actions in
 * `lib/rating/rep-engine.ts#REP_TABLE`, not from badges.
 */
const DEFINITIONS = {
  "initiation-complete": {
    name: "Прошёл Ритуал Инициации",
    description: "Completed the Initiation Ritual.",
    category: "personal" as const,
  },
  "level-up-2": {
    name: "Поднялся с Уровня I до II",
    description: "Promoted from Initiate to Keeper.",
    category: "personal" as const,
  },
  "level-up-3": {
    name: "Поднялся с Уровня II до III",
    description: "Promoted from Keeper to Steward.",
    category: "personal" as const,
  },
  "first-reputation-star": {
    name: "Первая звезда репутации",
    description: "Received your first review.",
    category: "personal" as const,
  },
  "first-post": {
    name: "Создал первый материал",
    description: "Published your first piece of content.",
    category: "personal" as const,
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
