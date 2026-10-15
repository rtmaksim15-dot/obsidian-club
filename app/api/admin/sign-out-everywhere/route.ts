import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/auth/supabase-server";
import { ADMIN_STEPUP_COOKIE_NAME } from "@/lib/auth/admin-stepup";

// POST /api/admin/sign-out-everywhere — admin security hardening,
// Package S1, item 4 (2026-10-15, see DECISIONS.md). Supabase's own
// `scope: "global"` sign-out revokes every refresh token for this
// account (every browser/device), not just the one making this
// request — this request's own session goes with it too, same as any
// "sign out everywhere" button's conventional behavior elsewhere.
// Clears this browser's own step-up cookie alongside it, so a stale
// aal2-but-no-longer-really-signed-in state can't linger here either.
export async function POST() {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    return NextResponse.json({ error: "Could not sign out everywhere. Try again." }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_STEPUP_COOKIE_NAME);
  return response;
}
