import { NextResponse } from "next/server";
import type { UserPracticeKind } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getActivePracticeTags,
  getUserPractices,
  setUserPractice,
  getPracticesVisibility,
  setPracticesVisibility,
  PRACTICES_VISIBILITY_VALUES,
  type PracticesVisibility,
} from "@/lib/profile/practices";

const KIND_VALUES: UserPracticeKind[] = ["limit", "practice", "curious"];

// GET /api/profile/practices — the caller's own editable state: the
// full curated tag list (Profile lite, B2, Package 4, Phase B,
// 2026-10-13, see DECISIONS.md) plus their current selections and
// visibility setting, for the profile-edit UI.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  const [tags, practices, visibility] = await Promise.all([
    getActivePracticeTags(),
    getUserPractices(user.id),
    getPracticesVisibility(user.id),
  ]);
  return NextResponse.json({ tags, practices, visibility });
}

type Body = { tagId?: string; kind?: UserPracticeKind | null; visibility?: string };

// PATCH /api/profile/practices — either sets one tag's kind (kind:
// null clears it) or the visibility setting, independently; a single
// request may include either or both.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.tagId !== undefined) {
    if (body.kind !== null && !KIND_VALUES.includes(body.kind as UserPracticeKind)) {
      return NextResponse.json({ error: "Invalid kind." }, { status: 422 });
    }
    await setUserPractice(user.id, body.tagId, body.kind ?? null);
  }

  if (body.visibility !== undefined) {
    if (!PRACTICES_VISIBILITY_VALUES.includes(body.visibility as PracticesVisibility)) {
      return NextResponse.json({ error: "Invalid visibility." }, { status: 422 });
    }
    await setPracticesVisibility(user.id, body.visibility as PracticesVisibility);
  }

  return NextResponse.json({ ok: true });
}
