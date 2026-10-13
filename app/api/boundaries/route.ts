import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAgeVerifiedApi } from "@/lib/age-verification/gate";
import { getBoundaries, setBoundaries, type BoundariesSettings, type WhoCanMessage } from "@/lib/dm/boundaries";

const WHO_CAN_MESSAGE_VALUES: WhoCanMessage[] = ["members", "following", "nobody_new"];

// GET /api/boundaries — the caller's own Boundaries settings (Package 4,
// Phase A, 2026-10-13, see DECISIONS.md).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  return NextResponse.json({ boundaries: await getBoundaries(user.id) });
}

type Body = { whoCanMessage?: string; showCity?: boolean; acceptRequests?: boolean };

// PATCH /api/boundaries — edits the CALLER's own Boundaries. Every
// field is optional (a partial patch), read-merge-written onto
// UserProfile.settings.boundaries per CLAUDE.md rule 9.
export async function PATCH(request: Request) {
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

  const patch: Partial<BoundariesSettings> = {};

  if (body.whoCanMessage !== undefined) {
    if (!WHO_CAN_MESSAGE_VALUES.includes(body.whoCanMessage as WhoCanMessage)) {
      return NextResponse.json({ error: "Invalid whoCanMessage value." }, { status: 422 });
    }
    patch.whoCanMessage = body.whoCanMessage as WhoCanMessage;
  }
  if (body.showCity !== undefined) {
    if (typeof body.showCity !== "boolean") {
      return NextResponse.json({ error: "showCity must be a boolean." }, { status: 422 });
    }
    patch.showCity = body.showCity;
  }
  if (body.acceptRequests !== undefined) {
    if (typeof body.acceptRequests !== "boolean") {
      return NextResponse.json({ error: "acceptRequests must be a boolean." }, { status: 422 });
    }
    patch.acceptRequests = body.acceptRequests;
  }

  return NextResponse.json({ boundaries: await setBoundaries(user.id, patch) });
}
