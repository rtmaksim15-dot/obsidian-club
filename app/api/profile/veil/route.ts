import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAgeVerifiedApi } from "@/lib/age-verification/gate";
import { setVeilEnabled } from "@/lib/profile/veil";

type Body = { veil?: boolean };

// POST /api/profile/veil (B6) — self only, owner-writes-own-row RLS
// posture same as the rest of this app's per-user preferences.
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
  if (typeof body.veil !== "boolean") {
    return NextResponse.json({ error: "veil must be a boolean." }, { status: 422 });
  }

  await setVeilEnabled(user.id, body.veil);
  return NextResponse.json({ ok: true });
}
