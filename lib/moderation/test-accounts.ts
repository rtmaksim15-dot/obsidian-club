import "server-only";
import { prisma } from "@/lib/db/prisma";

export { shouldHideTestAccount } from "./test-accounts-core";

// Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
// one source of truth for "which accounts are test accounts," same
// shape as lib/moderation/block.ts#getBlockedEitherWayUserIds (a
// query's own `where` clause can exclude the whole set directly,
// keeping any existing skip/take pagination correct). Never deletes
// or alters a test account's own data — this only ever filters what a
// non-admin viewer's queries return.
export async function getTestAccountUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: { isTest: true }, select: { id: true } });
  return rows.map((r) => r.id);
}
