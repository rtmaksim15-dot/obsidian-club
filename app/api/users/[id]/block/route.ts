import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// POST /api/users/:id/block — toggles the caller's block on another
// member (member protection mechanics, pre-launch legal package,
// 2026-08-09). Mutual in effect: lib/moderation/block.ts's
// isBlockedEitherWay() is what every enforcement point actually checks,
// not just this row's own direction — a block is "we don't see each
// other," not "I don't see them." Blocking also tears down any existing
// follow relationship in both directions, same as unfollowing would.
//
// Direct Messages (2026-09-14, see DECISIONS.md), item 5: a block
// "cancels any pending request in both directions." `cancelled` is its
// own status, deliberately not reused from `declined` — the two-strike
// door (lib/dm/lifecycle.ts#isStrike) only counts a real decline or a
// silent expiry, not a block, since a block already closes the door on
// its own, unconditionally. No notification either way: blocking is
// silent by design, same as leaving a thread is. An existing accepted
// thread is untouched here — new messages into it are rejected at send
// time (POST /api/dm/threads/:id/messages), history stays readable;
// preserve, never delete, same principle Report already uses.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  if (user.id === params.id) {
    return NextResponse.json({ error: "You can't block yourself." }, { status: 422 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
  });

  try {
    if (existing) {
      await prisma.block.delete({
        where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
      });
      return NextResponse.json({ blocked: false });
    }

    await prisma.$transaction([
      prisma.block.create({ data: { blockerId: user.id, blockedId: target.id } }),
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: user.id, followingId: target.id },
            { followerId: target.id, followingId: user.id },
          ],
        },
      }),
      prisma.conversationRequest.updateMany({
        where: {
          status: "pending",
          OR: [
            { senderId: user.id, recipientId: target.id },
            { senderId: target.id, recipientId: user.id },
          ],
        },
        data: { status: "cancelled", respondedAt: new Date() },
      }),
    ]);
    return NextResponse.json({ blocked: true });
  } catch (err) {
    console.error("[users/block] Failed to toggle block:", err);
    return NextResponse.json({ error: "Could not update. Try again shortly." }, { status: 503 });
  }
}
