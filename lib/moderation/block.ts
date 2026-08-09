import { prisma } from "@/lib/db/prisma";

// A block is mutual in effect even though the row is one-directional
// (member protection mechanics, pre-launch legal package, 2026-08-09)
// — "we don't see each other," regardless of who initiated it. Every
// enforcement point (profile view today; anything else later) should
// call this rather than querying `Block` directly, so the mutual
// semantics live in exactly one place.
export async function isBlockedEitherWay(userIdA: string, userIdB: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
    select: { id: true },
  });
  return block !== null;
}
