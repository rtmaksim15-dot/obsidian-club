import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";

// POST /api/auth/mfa/enroll — item 2, 2026-09-17 (see DECISIONS.md).
//
// Security fix (2026-09-23, see DECISIONS.md): this used to be
// reachable at aal1 unconditionally, with no check for whether a
// verified factor already existed. That let anyone holding a stolen
// aal1 admin session cookie call this to mint themselves a brand new,
// self-controlled TOTP secret, then confirm it via POST
// /api/auth/mfa/verify — stepping the *stolen* session up to aal2 and
// defeating the entire MFA control, without ever knowing the real
// admin's actual factor.
//
// The "no factor yet has nothing to step up from" reasoning behind
// aal1-reachability is only actually true for that one case — a truly
// unenrolled admin. The moment a verified factor exists, sign-in
// itself already forces the aal2 step-up before landing anywhere in
// the app (see app/api/auth/sign-in/route.ts's nextLevel/currentLevel
// handling) — so a real admin adding a *second* authenticator from
// /account/security is always already aal2 by the time they get there,
// and requiring aal2 here doesn't lock anyone legitimate out. Only the
// true bootstrap case (zero verified factors) is still allowed at
// aal1, which is the one case that genuinely has nothing to step up
// from.
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
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
        { error: "Verify your existing authenticator before adding another." },
        { status: 403 },
      );
    }
  }

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
