import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { recordLegalConsent } from "@/lib/legal/record-consent";
import { getClientIp } from "@/lib/security/rate-limit";

type Body = { ageConfirmed?: boolean; termsAccepted?: boolean; aupAccepted?: boolean };

// POST /api/legal/reconsent — records a new LegalConsent row for an
// already-logged-in member re-accepting after a document version
// change (see app/(auth)/legal-reconsent/page.tsx and
// app/(platform)/layout.tsx's redirect).
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.ageConfirmed || !body.termsAccepted || !body.aupAccepted) {
    return NextResponse.json({ error: "You must accept all three agreements to continue." }, { status: 422 });
  }

  await recordLegalConsent(user.id, getClientIp(request));

  return NextResponse.json({ ok: true });
}
