import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAgeVerifiedApi } from "@/lib/age-verification/gate";
import { acceptBondRequest, dissolveBond } from "@/lib/profile/bonds";

type Body = { action?: "accept" };

// PATCH /api/bonds/:id — accept a pending request (only the recipient
// may accept). Profile lite, B3 (Package 4, Phase B, 2026-10-13, see
// DECISIONS.md).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
  if (body.action !== "accept") {
    return NextResponse.json({ error: 'action must be "accept".' }, { status: 422 });
  }

  const result = await acceptBondRequest(params.id, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/bonds/:id — dissolve (either side, instantly — also the
// decline path for a still-pending request; BondStatus has no separate
// declined state, see DECISIONS.md).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const result = await dissolveBond(params.id, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, message: "The bond has been dissolved." });
}
