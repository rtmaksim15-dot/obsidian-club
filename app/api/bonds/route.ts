import { NextResponse } from "next/server";
import type { BondKind } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAgeVerifiedApi } from "@/lib/age-verification/gate";
import { createBondRequest } from "@/lib/profile/bonds";

const KIND_VALUES: BondKind[] = ["partner", "dominant_of", "submissive_of"];

type Body = { toUserId?: string; kind?: string };

// POST /api/bonds — send a bond request (Profile lite, B3, Package 4,
// Phase B, 2026-10-13, see DECISIONS.md). Accept/dissolve are on
// /api/bonds/[id].
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  const ageBlocked = requireAgeVerifiedApi(user);
  if (ageBlocked) return ageBlocked;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const toUserId = body.toUserId?.trim();
  if (!toUserId) {
    return NextResponse.json({ error: "Missing recipient." }, { status: 422 });
  }
  if (!KIND_VALUES.includes(body.kind as BondKind)) {
    return NextResponse.json({ error: "Invalid kind." }, { status: 422 });
  }

  const result = await createBondRequest(user.id, toUserId, body.kind as BondKind);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
