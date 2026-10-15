import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_COOKIE_OPTIONS } from "./lib/auth/cookie-options";
import { isAdminId } from "./lib/auth/admin-allowlist";
import {
  ADMIN_STEPUP_COOKIE_NAME,
  ADMIN_STEPUP_COOKIE_OPTIONS,
  signStepUpCookie,
  verifyStepUpCookie,
} from "./lib/auth/admin-stepup";
import { decideStepUp } from "./lib/auth/admin-stepup-policy";

// Refreshes the Supabase session on every request and gates the
// authenticated Platform routes (ADR-0010). Fine-grained checks (e.g.
// isAdmin) happen in the route/page itself via lib/auth/session.ts —
// this only decides "is there a valid session at all."
const PROTECTED_PREFIXES = [
  "/hall",
  "/rooms",
  "/profile",
  "/events",
  "/content", // kept protected — now just a redirect to /feed, see ADR-0015
  "/feed",
  "/compose",
  "/members",
  "/library",
  "/posts",
  "/vault",
  "/houses",
  "/marketplace",
  "/progress",
  "/admin",
  "/ritual",
  "/codex",
  "/messages",
  "/account",
  "/keepsakes",
  "/notifications",
];

export async function middleware(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));

  // Supabase isn't provisioned yet (see TECH_DEBT.md) — NEXT_PUBLIC_SUPABASE_URL
  // is empty in this environment. createServerClient() throws on an empty
  // URL, which would otherwise crash EVERY request, including the public
  // landing page. Degrade instead: fail closed on protected routes (no
  // session possible without Supabase, so redirect to /login same as an
  // anonymous visitor), and let everything else through untouched.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md)
  // — step-up (12h) + idle timeout (30m), enforced once here for both
  // /admin pages and /api/admin/* routes, rather than duplicated in
  // each (both already pass through this middleware; PROTECTED_PREFIXES
  // above only covers "/admin" as a page prefix, not "/api/admin", so
  // this check is independent of `isProtected`).
  //
  // Only runs this extra gate for a request that's ALREADY a real,
  // currently-aal2 admin per Supabase — i.e. someone who has
  // demonstrably completed MFA for this account at some point in this
  // very session. For anyone else (not logged in, logged in but not an
  // admin, or an admin whose session never reached aal2 at all), this
  // deliberately does nothing extra and falls through to the existing
  // requireAdmin()/requireAdminApi() checks, which 404/403 them exactly
  // as before (item 2, 2026-09-17's own obscurity reasoning: a stranger
  // and an admin-without-MFA must stay indistinguishable from outside —
  // redirecting straight to an MFA entry screen here would leak "this
  // account is an admin, just needs a code" to anyone holding a stolen
  // aal1 session cookie). The 12h/30m freshness check only ever applies
  // to someone who can't be that stranger, since they already hold a
  // live aal2 session on a real admin account.
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/api/admin");
  if (isAdminPath && user && isAdminId(user.id)) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === "aal2") {
      if (!process.env.ADMIN_SESSION_SECRET) {
        // Fail OPEN for this one new gate specifically — not the
        // surrounding isAdmin+aal2 check above, which already stands on
        // its own regardless of this env var. A missing signing secret
        // means verifyStepUpCookie()/signStepUpCookie() can only ever
        // return null (both fail closed by design, see admin-stepup.ts)
        // — without this explicit bypass, that would make
        // decideStepUp() return "require-stepup" for literally every
        // request forever (no cookie can ever be minted to satisfy it
        // either), redirecting every admin, including the founder, into
        // an MFA loop they can never clear. Missing env var degrades to
        // "no step-up/idle timeout enforced yet," not "nobody can use
        // /admin" — same severity-matched failure mode as, e.g.,
        // RESEND_API_KEY being unset skipping email instead of blocking
        // signups.
        console.error("[middleware] ADMIN_SESSION_SECRET is unset — admin step-up/idle timeout is not enforced.");
      } else {
        const state = await verifyStepUpCookie(request.cookies.get(ADMIN_STEPUP_COOKIE_NAME)?.value);
        const decision = decideStepUp(state, Date.now());

        if (decision.action === "require-stepup") {
          if (request.nextUrl.pathname.startsWith("/api/admin")) {
            return NextResponse.json({ error: "Re-verification required." }, { status: 401 });
          }
          const mfaUrl = new URL("/login/mfa", request.url);
          mfaUrl.searchParams.set("next", request.nextUrl.pathname);
          return NextResponse.redirect(mfaUrl);
        }

        const refreshedCookie = await signStepUpCookie(decision.refreshedState);
        if (refreshedCookie) {
          response.cookies.set(ADMIN_STEPUP_COOKIE_NAME, refreshedCookie, ADMIN_STEPUP_COOKIE_OPTIONS);
        }
      }
    }
    // currentLevel !== "aal2": fall through unchanged, see comment above.
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, images, the generated
     * PWA icon/OG routes, and the OAuth callback — matches how
     * ARCHITECTURE.md scopes middleware to real navigable pages, not
     * asset requests. `/auth/callback` is excluded so this middleware's
     * own session-refresh cookie handling can never interfere with the
     * callback route establishing a brand-new session — it has nothing
     * useful to do there anyway (not a protected route, no existing
     * session to refresh).
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|opengraph-image|auth/callback).*)",
  ],
};
