import { NextResponse } from "next/server";
import type { UserPracticeKind } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { PRACTICES_UI_ENABLED } from "@/lib/config/feature-flags";
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
//
// Hidden, not removed (founder decision, 2026-10-22, see DECISIONS.md)
// — "too much load for members." practice_tags/user_practices and
// every existing row stay exactly as they are; this route just stops
// serving while PRACTICES_UI_ENABLED is false, same as the editor and
// profile-page rows stop rendering.
export async function GET() {
  if (!PRACTICES_UI_ENABLED) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
  if (!PRACTICES_UI_ENABLED) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
