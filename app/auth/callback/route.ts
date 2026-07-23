import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

// GET /auth/callback — Supabase OAuth (PKCE) redirect target. Google
// Sign-In (and any future OAuth provider) redirects here with a `code`
// query param after the user authorizes on the provider's own page; this
// exchanges it for a real session, then sends the browser on to wherever
// it was headed (`next`, same param `/login` already uses for
// email/password).
//
// Builds its own Supabase client here rather than reusing
// lib/auth/supabase-server.ts's createClient(): that helper writes
// cookies through next/headers' cookies(), which only auto-attaches to
// the response Next.js builds implicitly (Server Components) — it does
// NOT attach to a NextResponse you construct and return yourself, which
// is exactly what a redirect requires. Without this, exchangeCodeForSession
// succeeds (no error) but the session cookie never reaches the browser,
// so the very next request to a protected route (e.g. /hall) sees no
// session and middleware bounces it straight back to /login. Same
// pattern middleware.ts already uses: cookies are collected here and
// applied to whichever redirect response we end up returning, not
// written through the ambient cookies() API.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/feed";

  function redirectWithCookies(path: string, cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[]) {
    const response = NextResponse.redirect(`${origin}${path}`);
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  }

  // Supabase's OWN /auth/v1/callback appends these if IT failed before
  // ever reaching us (e.g. redirect_to not in the Auth "Redirect URLs"
  // allowlist) — logged so a failure is diagnosable from the server
  // console instead of just silently landing back on /login.
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");
  if (providerError) {
    console.error(`[auth/callback] Supabase/provider error: ${providerError} — ${providerErrorDescription}`);
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const authUser = data.session.user;

      // The club is closed — Google (or any future OAuth provider)
      // establishing a real Supabase Auth session does NOT by itself
      // make someone a member. Only a matching `public.users` row does
      // (created today by the admin-approval flow). A first-time OAuth
      // sign-in with no matching row is treated the same as a fresh
      // waitlist application, not silently let in — confirmed with Max,
      // see DECISIONS.md.
      const member = await prisma.user.findUnique({ where: { id: authUser.id } });
      if (member) {
        return redirectWithCookies(next, cookiesToSet);
      }

      const email = authUser.email!;
      const name =
        (authUser.user_metadata?.full_name as string | undefined) ||
        (authUser.user_metadata?.name as string | undefined) ||
        null;

      const existingApplication = await prisma.waitlist.findUnique({ where: { email } });
      if (!existingApplication) {
        await prisma.waitlist.create({
          data: { email, name, source: "Google OAuth" },
        });
      }

      return redirectWithCookies("/apply?status=pending", cookiesToSet);
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error?.message, error?.status, error?.code);
  } else {
    console.error("[auth/callback] No `code` param on the callback request.");
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
