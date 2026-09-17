import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";

// POST /api/auth/mfa/enroll — item 2, 2026-09-17 (see DECISIONS.md).
// Admin-only: enrollment is only ever offered on /account/security to
// an allowlisted account. Deliberately reachable at aal1, not gated by
// requireAdmin() (which demands aal2) — an admin with no factor yet has
// nothing to step up from, and gating enrollment behind the thing it
// exists to satisfy would make it impossible to ever start. Returns an
// UNVERIFIED factor; it only becomes real (and steps the session to
// aal2) once POST /api/auth/mfa/verify succeeds against it.
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not start enrollment." }, { status: 503 });
  }

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  });
}
