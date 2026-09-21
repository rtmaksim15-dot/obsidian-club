import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { logAdminAuthEvent } from "@/lib/security/admin-auth-log";
import { sendAdminSignInCompletedAlert } from "@/lib/utils/email";

const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

// "login" (MfaChallengeForm.tsx, the per-sign-in step-up screen at
// /login/mfa) vs "enroll" (MfaSecurityPanel.tsx, confirming a newly
// added authenticator from /account/security while already signed in)
// — item 3, 2026-09-22, see DECISIONS.md. Only "login" is actually a
// sign-in completing; the stage-2 alert email fires only for it.
type Context = "login" | "enroll";
type Body = { factorId?: string; code?: string; context?: Context };

// POST /api/auth/mfa/verify — item 2. Used for both completing a brand
// new enrollment and the regular per-sign-in step-up: Supabase's
// challengeAndVerify() call is identical either way (an unverified
// factor becomes verified on its first success; an already-verified one
// just steps the current session to aal2). MFA in this app only ever
// applies to admins, so every attempt from an admin account is logged,
// success and failure — a 6-digit TOTP code is guessable in enough
// tries that the rate limit above matters more here than almost
// anywhere else in this codebase.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`mfa-verify:${ip}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.factorId || !body.code) {
    return NextResponse.json({ error: "Missing factor or code." }, { status: 422 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId: body.factorId, code: body.code });

  if (user.isAdmin) {
    await logAdminAuthEvent({
      userId: user.id,
      email: user.email,
      type: error || !data ? "mfa_challenge_failure" : "mfa_challenge_success",
      ip,
      userAgent: request.headers.get("user-agent"),
    });

    // Stage 2 alert (item 3, 2026-09-22, see DECISIONS.md) — only for
    // the login step-up completing, never for confirming a newly
    // enrolled factor from an already-signed-in session (that isn't a
    // sign-in). Awaited for the same reason as stage 1 — see
    // DECISIONS.md.
    if (!error && data && body.context === "login") {
      await sendAdminSignInCompletedAlert({
        email: user.email,
        ip,
        userAgent: request.headers.get("user-agent"),
        at: new Date(),
      }).catch((err) => console.error("[auth/mfa/verify] Failed to send sign-in-completed alert:", err));
    }
  }

  if (error || !data) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
