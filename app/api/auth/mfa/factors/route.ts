import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";

// GET /api/auth/mfa/factors — item 2. Lets /account/security show
// current enrollment state. Any authenticated user can call this (it
// only ever returns their own factors); enrolling/verifying a new one
// is separately restricted to admins.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    return NextResponse.json({ error: "Could not load factors." }, { status: 503 });
  }

  return NextResponse.json({
    factors: (data?.totp ?? []).map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name ?? null,
      status: f.status,
      createdAt: f.created_at,
    })),
  });
}
