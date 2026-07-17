import { NextResponse } from "next/server";

// Closed Registration & Invite System (2026-07-17): the only way to
// create an account is redeeming a real invite token at
// /invite/[token] (app/api/invite/[token]/route.ts). This route exists
// purely to answer "/register" (and any method on it) with an explicit
// 403 rather than a generic 404, in case anything ever links here.
//
// This only covers our own app — it can't stop someone from calling
// Supabase's own signup API directly with the public anon key. The
// complete fix is a Supabase-dashboard-only setting: Authentication →
// Providers → Email → turn off "Allow new users to sign up." No API
// exposes that toggle to this codebase (it's a project-level Auth
// setting, not something the service-role key can flip) — see
// TECH_DEBT.md; Max needs to set it manually.
function blocked() {
  return NextResponse.json(
    { error: "Direct registration is closed. You need an invite link." },
    { status: 403 },
  );
}

export const GET = blocked;
export const POST = blocked;
