import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dismissNewcomerPath } from "@/lib/newcomer-path/status";

const DISMISS_HOURS = 24;

// POST /api/newcomer-path/dismiss — "Later" (Package 5, Phase A,
// 2026-10-14, see DECISIONS.md): collapses THE PATH OF THE INITIATE
// card to a one-line bar for 24h.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  await dismissNewcomerPath(user.id, DISMISS_HOURS);
  return NextResponse.json({ ok: true });
}
