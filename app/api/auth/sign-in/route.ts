import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { prisma } from "@/lib/db/prisma";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/auth/cookie-options";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { logAdminAuthEvent, resolveAdminByEmail } from "@/lib/security/admin-auth-log";
import { sendAdminPasswordAcceptedAlert, sendAdminAccountLockoutAlert } from "@/lib/utils/email";
import { getApproxLocation } from "@/lib/security/geo";
import { isAccountLockedOut } from "@/lib/security/account-lockout";
import { errCode } from "@/lib/utils/safe-error";

// POST /api/auth/sign-in — item 2, 2026-09-17 (see DECISIONS.md). The
// email/password path used to call supabase.auth.signInWithPassword()
// directly from the browser (app/(auth)/login/page.tsx) — a client that
// simply doesn't call a "log this" endpoint leaves no trace, which
// isn't good enough for "log every admin sign-in and MFA challenge,
// success and failure." Moving the actual sign-in call server-side (the
// same pattern app/auth/callback/route.ts already uses for cookies)
// makes logging unconditional and unbypassable by the client, not just
// best-effort. Only sign-ins that resolve to a real, allowlisted admin
// account are written to AdminAuthEvent — see resolveAdminByEmail().
//
// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md),
// item 8 — lowered 10 -> 5 attempts/15min to match the task's own
// spec'd number (also now the same number as the MFA-verify route's
// own per-IP limit, one fewer number to reason about). A per-ACCOUNT
// lockout runs below too, independent of this per-IP one — see that
// block's own comment.
const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
const ACCOUNT_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_LOCKOUT_MAX_FAILURES = 5;
const LOCKOUT_ALERT_DEBOUNCE = { max: 1, windowMs: 15 * 60 * 1000 };

type Body = { email?: string; password?: string };

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(`auth-signin:${ip}`, RATE_LIMIT);
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

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 422 });
  }

  // Per-ACCOUNT lockout (item 8, Package S1, 2026-10-15, see
  // DECISIONS.md), independent of the per-IP limit above — reuses
  // AdminAuthEvent (already logs every sign_in_failure with a
  // timestamp) as the rolling-window failure count, same reasoning and
  // same numbers as the MFA-verify route's matching lockout. Checked
  // before ever calling signInWithPassword() — a locked-out account
  // shouldn't even get a real password check run against it.
  const lockoutCandidate = await resolveAdminByEmail(email);
  if (lockoutCandidate) {
    const windowStart = new Date(Date.now() - ACCOUNT_LOCKOUT_WINDOW_MS);
    const recentFailures = await prisma.adminAuthEvent.count({
      where: { userId: lockoutCandidate.id, type: "sign_in_failure", createdAt: { gte: windowStart } },
    });
    if (isAccountLockedOut(recentFailures, ACCOUNT_LOCKOUT_MAX_FAILURES)) {
      const alertGate = await checkRateLimit(`signin-lockout-alert:${lockoutCandidate.id}`, LOCKOUT_ALERT_DEBOUNCE);
      if (alertGate.allowed) {
        await sendAdminAccountLockoutAlert({
          email,
          ip,
          userAgent: request.headers.get("user-agent"),
          at: new Date(),
          location: getApproxLocation(request.headers),
          context: "password",
        }).catch((err) => console.error("[auth/sign-in] Failed to send lockout alert:", errCode(err)));
      }
      return NextResponse.json({ error: "Too many attempts for this account. Try again later." }, { status: 429 });
    }
  }

  let cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookiesToSet = cookies;
        },
      },
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  const admin = await resolveAdminByEmail(email);
  if (admin) {
    await logAdminAuthEvent({
      userId: admin.id,
      email,
      type: error || !data.session ? "sign_in_failure" : "sign_in_success",
      ip,
      userAgent: request.headers.get("user-agent"),
    });
  }

  if (error || !data.session) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Tells the client whether an MFA step-up is available (a factor is
  // enrolled) so it knows whether to show the code-entry screen before
  // treating sign-in as complete — see app/(auth)/login/page.tsx.
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // Stage 1 alert (item 3, 2026-09-22, see DECISIONS.md) — only when a
  // step-up is actually about to be asked for; an admin with no
  // authenticator enrolled never reaches nextLevel "aal2" at all, and
  // "awaiting code" would be wrong to say if no code is ever coming.
  // Awaited, not fire-and-forget — nothing else in this handler runs
  // after it, and an un-awaited send here isn't guaranteed to finish
  // the network round trip to Resend before a serverless function can
  // freeze on return (see DECISIONS.md, the report-alert email fix).
  if (admin && aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
    await sendAdminPasswordAcceptedAlert({
      email,
      ip,
      userAgent: request.headers.get("user-agent"),
      at: new Date(),
      location: getApproxLocation(request.headers),
    }).catch((err) => console.error("[auth/sign-in] Failed to send password-accepted alert:", errCode(err)));
  }

  const response = NextResponse.json({
    ok: true,
    currentLevel: aalData?.currentLevel ?? "aal1",
    nextLevel: aalData?.nextLevel ?? "aal1",
  });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
