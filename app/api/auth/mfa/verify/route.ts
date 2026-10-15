import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { logAdminAuthEvent } from "@/lib/security/admin-auth-log";
import { sendAdminSignInCompletedAlert, sendAdminAccountLockoutAlert } from "@/lib/utils/email";
import { errCode } from "@/lib/utils/safe-error";
import { getApproxLocation } from "@/lib/security/geo";
import { hashIp } from "@/lib/security/ip-hash";
import { parseUserAgent } from "@/lib/security/user-agent";
import { signStepUpCookie, ADMIN_STEPUP_COOKIE_NAME, ADMIN_STEPUP_COOKIE_OPTIONS } from "@/lib/auth/admin-stepup";
import { isAccountLockedOut } from "@/lib/security/account-lockout";

const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md),
// item 8 — per-ACCOUNT lockout, on top of the per-IP limit above. Reuses
// AdminAuthEvent (already logs every mfa_challenge_failure with a
// timestamp) as the rolling-window failure count, rather than a new
// table — a distributed guesser spreading attempts across many IPs
// against ONE admin account's TOTP isn't stopped by a per-IP limit
// alone. Same threshold/window as the per-IP limit, deliberately —
// nothing in the task asked for a different number, and matching them
// keeps there being only one number to reason about.
const ACCOUNT_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LOCKOUT_MAX_FAILURES = 5;
// Debounces the lockout alert email itself via the same checkRateLimit
// infra every other rate limit in this codebase uses — without this, a
// sustained attack re-triggering the lockout check on every blocked
// request would re-send the alert every time too.
const LOCKOUT_ALERT_DEBOUNCE = { max: 1, windowMs: 15 * 60 * 1000 };

// "login" (MfaChallengeForm.tsx, the per-sign-in step-up screen at
// /login/mfa) vs "enroll" (MfaSecurityPanel.tsx, confirming a newly
// added authenticator from /account/security while already signed in)
// — item 3, 2026-09-22, see DECISIONS.md. Only "login" is actually a
// sign-in completing; the stage-2 alert email fires only for it. Both
// contexts are an equally real, fresh TOTP verification, though — the
// step-up cookie (item 3, Package S1) refreshes for either one.
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
  const userAgentHeader = request.headers.get("user-agent");

  const rateLimit = await checkRateLimit(`mfa-verify:${ip}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (user.isAdmin) {
    const windowStart = new Date(Date.now() - ACCOUNT_LOCKOUT_WINDOW_MS);
    const recentFailures = await prisma.adminAuthEvent.count({
      where: { userId: user.id, type: "mfa_challenge_failure", createdAt: { gte: windowStart } },
    });
    if (isAccountLockedOut(recentFailures, ACCOUNT_LOCKOUT_MAX_FAILURES)) {
      const alertGate = await checkRateLimit(`mfa-lockout-alert:${user.id}`, LOCKOUT_ALERT_DEBOUNCE);
      if (alertGate.allowed) {
        await sendAdminAccountLockoutAlert({
          email: user.email,
          ip,
          userAgent: userAgentHeader,
          at: new Date(),
          location: getApproxLocation(request.headers),
          context: "authenticator code",
        }).catch((err) => console.error("[auth/mfa/verify] Failed to send lockout alert:", errCode(err)));
      }
      return NextResponse.json(
        { error: "Too many incorrect codes for this account. Try again later." },
        { status: 429 },
      );
    }
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
  const succeeded = !error && Boolean(data);

  if (user.isAdmin) {
    await logAdminAuthEvent({
      userId: user.id,
      email: user.email,
      type: succeeded ? "mfa_challenge_success" : "mfa_challenge_failure",
      ip,
      userAgent: userAgentHeader,
    });

    // Stage 2 alert (item 3, 2026-09-22, see DECISIONS.md) — only for
    // the login step-up completing, never for confirming a newly
    // enrolled factor from an already-signed-in session (that isn't a
    // sign-in). Awaited for the same reason as stage 1 — see
    // DECISIONS.md. Enriched with approximate location and parsed
    // browser/OS (item 5, Package S1, 2026-10-15).
    if (succeeded && body.context === "login") {
      await sendAdminSignInCompletedAlert({
        email: user.email,
        ip,
        userAgent: userAgentHeader,
        at: new Date(),
        location: getApproxLocation(request.headers),
      }).catch((err) => console.error("[auth/mfa/verify] Failed to send sign-in-completed alert:", errCode(err)));
    }
  }

  if (!succeeded) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  if (user.isAdmin) {
    // Step-up (item 3, Package S1) — a fresh TOTP verification, whether
    // completing sign-in or confirming a new enrollment, resets both
    // clocks (admin-stepup-policy.ts). Fails silently to "no cookie set"
    // if ADMIN_SESSION_SECRET is unset — middleware.ts's own matching
    // fallback already treats that as "step-up/idle not enforced yet,"
    // not a lockout, so this mirrors that rather than erroring the
    // whole successful verify over a missing env var.
    const now = Date.now();
    const cookieValue = await signStepUpCookie({ mfaVerifiedAtMs: now, lastActivityMs: now });
    if (cookieValue) {
      response.cookies.set(ADMIN_STEPUP_COOKIE_NAME, cookieValue, ADMIN_STEPUP_COOKIE_OPTIONS);
    }

    // admin_access_log (item 5, Package S1) — one row per successful
    // step-up, hashed IP + short parsed user agent, not the raw values
    // AdminAuthEvent already carries (see that table's own schema
    // comment for the split). Best-effort: a logging failure must never
    // undo an otherwise-successful MFA verification.
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (secret) {
      const { browser, os } = parseUserAgent(userAgentHeader);
      await prisma.adminAccessLog
        .create({
          data: { userId: user.id, ipHash: await hashIp(ip, secret), userAgent: `${browser} on ${os}` },
        })
        .catch((err) => console.error("[auth/mfa/verify] Failed to write admin_access_log:", errCode(err)));
    }
  }

  return response;
}
