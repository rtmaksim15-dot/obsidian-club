import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TOKEN_SELECT, shapeTokenRow, sortTokensFailedFirst } from "@/lib/admin/token-shape";

// GET /api/admin/invite-tokens?cursor=<tokenId> — Zone 4 pagination
// (2026-09-12, closing the "454 of 504 tokens invisible" gap flagged in
// the E2E audit). `cursor` is the id of the last token already shown;
// the admin page's own initial fetch and this route share the same
// order (createdAt desc, id as tie-breaker) and the same "fetch 51,
// keep 50" trick to know whether yet another page follows.
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const cursor = new URL(request.url).searchParams.get("cursor");

  const page = await prisma.inviteToken.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: TOKEN_SELECT,
  });

  const hasMore = page.length > 50;
  const nextCursor = hasMore ? page[50].id : null;
  const rows = page.slice(0, 50);

  const nameLookupIds = Array.from(
    new Set(
      [...rows.map((t) => t.redeemedById), ...rows.map((t) => t.inviterId), ...rows.map((t) => t.partnerOfId)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  const nameLookupRows = nameLookupIds.length
    ? await prisma.user.findMany({ where: { id: { in: nameLookupIds } }, select: { id: true, displayName: true } })
    : [];
  const nameById = new Map(nameLookupRows.map((r) => [r.id, r.displayName]));

  const now = new Date();
  const tokens = sortTokensFailedFirst(rows).map((t) => shapeTokenRow(t, nameById, now));

  return NextResponse.json({ tokens, nextCursor });
}
