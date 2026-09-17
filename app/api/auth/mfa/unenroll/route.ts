import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/auth/supabase-server";

type Body = { factorId?: string };

// POST /api/auth/mfa/unenroll — item 2. Lets the admin remove a factor
// themselves (a lost-device cleanup, or replacing one) from
// /account/security. Admin-only, same reasoning as enroll.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.factorId) {
    return NextResponse.json({ error: "Missing factor." }, { status: 422 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId: body.factorId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
