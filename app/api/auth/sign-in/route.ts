import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { logAdminAuthEvent, resolveAdminByEmail } from "@/lib/security/admin-auth-log";
import { sendAdminPasswordAcceptedAlert } from "@/lib/utils/email";

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
const RATE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };

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
    }).catch((err) => console.error("[auth/sign-in] Failed to send password-accepted alert:", err));
  }

  const response = NextResponse.json({
    ok: true,
    currentLevel: aalData?.currentLevel ?? "aal1",
    nextLevel: aalData?.nextLevel ?? "aal1",
  });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
