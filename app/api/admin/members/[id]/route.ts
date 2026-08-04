import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

type Body = { ageVerified?: boolean };

// PATCH /api/admin/members/:id — toggle Age Verification on an existing
// member (2026-08-03). Field first, no enforcement gate yet — see
// DECISIONS.md. Separate from the approval-time checkbox in
// app/api/admin/applications/[id]/route.ts, which stages the same flag
// on Waitlist for members who haven't redeemed their invite yet.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.ageVerified !== "boolean") {
    return NextResponse.json({ error: "ageVerified must be a boolean." }, { status: 422 });
  }

  const member = await prisma.user.findUnique({ where: { id: params.id } });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ageVerified: body.ageVerified,
      ageVerifiedAt: body.ageVerified ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
