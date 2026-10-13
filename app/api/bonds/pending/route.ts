import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveAvatarUrl } from "@/lib/storage/resolve-media";

// GET /api/bonds/pending — the caller's own incoming pending bond
// requests (Profile lite, B3, Package 4, Phase B, 2026-10-13, see
// DECISIONS.md). Surfaced on the member's own profile page.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const rows = await prisma.bond.findMany({
    where: { toUserId: user.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      kind: true,
      createdAt: true,
      fromUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const requests = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      kind: r.kind,
      createdAt: r.createdAt.toISOString(),
      fromUser: { ...r.fromUser, avatarUrl: await resolveAvatarUrl(r.fromUser.avatarUrl) },
    })),
  );

  return NextResponse.json({ requests });
}
