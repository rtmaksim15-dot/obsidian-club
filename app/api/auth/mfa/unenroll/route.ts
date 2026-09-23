import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";

type Body = { factorId?: string };

// POST /api/auth/mfa/unenroll — item 2. Lets the admin remove a factor
// themselves (a lost-device cleanup, or replacing one) from
// /account/security.
//
// Security fix (2026-09-23, see DECISIONS.md): removing MFA protection
// is at least as sensitive as adding a new factor (see enroll/route.ts
// for the full reasoning) — a stolen aal1 session shouldn't be able to
// strip an admin's real protection either. Same aal2-when-protected
// gate as enroll, with one narrow exception: if there is no verified
// factor at all yet, removing an abandoned/unverified enrollment
// attempt (started, never confirmed) is safe cleanup at aal1 — nothing
// is actually being protected yet, and requiring aal2 here would be a
// real lockout (there'd be nothing to step up with).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.factorId) {
    return NextResponse.json({ error: "Missing factor." }, { status: 422 });
  }

  const supabase = await createClient();

  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) {
    return NextResponse.json({ error: "Could not check existing authenticators." }, { status: 503 });
  }
  const hasVerifiedFactor = factorsData.totp.some((f) => f.status === "verified");

  if (hasVerifiedFactor) {
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || aalData?.currentLevel !== "aal2") {
      return NextResponse.json(
        { error: "Verify your authenticator before removing it." },
        { status: 403 },
      );
    }
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId: body.factorId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
