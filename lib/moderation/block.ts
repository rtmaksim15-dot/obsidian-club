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

// Security fix (2026-09-23, see DECISIONS.md) — the one-to-one check
// above only ever covered a single known pair (profile view, DM). Every
// place that lists or fetches content by a not-yet-known set of authors
// (the feed, the posts list, a post's comments) needs the mutual set of
// ids blocked either way with the viewer, so it can be applied directly
// in the query's own `where` clause (`authorId: { notIn: ... }`) —
// filtering at the database level rather than after the fact keeps any
// existing `skip`/`take` pagination correct, since the count Prisma
// paginates over is the already-filtered set.
export async function getBlockedEitherWayUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }
  return Array.from(ids);
}
