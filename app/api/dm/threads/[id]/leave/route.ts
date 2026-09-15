import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// POST /api/dm/threads/:id/leave — item 6: "Leaving is silent and needs
// no explanation." Sets leftAt on the caller's own ThreadParticipant row
// only — no notification to the other participant, and the thread/
// messages themselves are never touched, so their history stays intact.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const updated = await prisma.threadParticipant.updateMany({
    where: { threadId: params.id, userId: user.id, leftAt: null },
    data: { leftAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
