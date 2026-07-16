import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { awardRep, REP_TABLE } from "@/lib/rating/rep-engine";

// POST /api/houses/:slug/join — real House membership (2026-07-16, REP
// system + Vault task). Idempotent: joining a house you're already in
// just confirms membership, never re-awards REP.
export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const house = await prisma.house.findUnique({ where: { slug: params.slug } });
  if (!house || house.status !== "active") {
    return NextResponse.json({ error: "House not found." }, { status: 404 });
  }

  const existing = await prisma.houseMembership.findUnique({
    where: { userId_houseId: { userId: user.id, houseId: house.id } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  await prisma.houseMembership.create({ data: { userId: user.id, houseId: house.id } });
  await awardRep(user.id, REP_TABLE.earn.houseJoined.points, `Joined ${house.name}`, "house-joined");

  return NextResponse.json({ ok: true, alreadyMember: false }, { status: 201 });
}
