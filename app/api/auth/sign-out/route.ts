import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// POST /api/auth/sign-out — full server-side sign-out (Sign Out, /hall,
// 2026-08-08). Builds its own Supabase client here rather than reusing
// lib/auth/supabase-server.ts's createClient(), same reason as
// app/auth/callback/route.ts: that helper writes cookies through
// next/headers' cookies(), which doesn't attach to a NextResponse
// constructed and returned by hand. supabase.auth.signOut() clears the
// session server-side (invalidates the refresh token, not just a local
// no-op) and its cleared cookies are collected here and attached to the
// redirect response middleware.ts's next getUser() check will actually
// see — a client-only signOut() wouldn't guarantee that.
//
// A plain <form method="POST"> submits here directly (no client JS
// required) — the browser follows the redirect after POST natively.
export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);
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

  await supabase.auth.signOut();

  // 303: this is a redirect after a POST, and the browser must follow
  // it with a GET, not re-POST to the landing page.
  const response = NextResponse.redirect(origin, { status: 303 });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
