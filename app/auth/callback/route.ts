import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/supabase-server";

// GET /auth/callback — Supabase OAuth (PKCE) redirect target. Google
// Sign-In (and any future OAuth provider) redirects here with a `code`
// query param after the user authorizes on the provider's own page; this
// exchanges it for a real session, then sends the browser on to wherever
// it was headed (`next`, same param `/login` already uses for
// email/password).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/hall";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
