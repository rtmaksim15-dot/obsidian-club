import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// POST /api/account/close — immediate, self-service account closure, no
// explanation or third-party approval required (member protection
// mechanics, pre-launch legal package, 2026-08-09). Soft: sets
// `status: "inactive"` rather than deleting the row — preserves
// moderation/legal history (reports filed against/by this account,
// posts, REP ledger) without needing a separate hard-delete flow this
// task didn't ask for. `/members` and profile lookups already filter to
// `status: "active"`, so an inactive account stops appearing anywhere
// the moment this runs.
//
// Same cookie-clearing sign-out as /api/auth/sign-out (see that route's
// comment for why this can't reuse lib/auth/supabase-server.ts) — a
// closed account shouldn't stay signed in.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { status: "inactive" } });

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

  const response = NextResponse.redirect(origin, { status: 303 });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
