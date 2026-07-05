import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  "/library",
  "/shop",
  "/marketplace",
  "/progress",
  "/admin",
  "/ritual",
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

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, images, and the generated
     * PWA icon/OG routes — matches how ARCHITECTURE.md scopes middleware
     * to real navigable pages, not asset requests.
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|opengraph-image).*)",
  ],
};
