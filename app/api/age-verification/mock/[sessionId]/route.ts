import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Dev/test-only: the mock provider's own stand-in for "Yoti's hosted
// page." lib/age-verification/index.ts refuses to select AGE_VERIFICATION_
// PROVIDER=mock when NODE_ENV=production (A3) — mirrored here as a second,
// defensive check, since this route writes a verification outcome
// directly with no provider round-trip at all.
export async function POST(request: Request, { params }: { params: { sessionId: string } }) {
  if (process.env.NODE_ENV === "production" || process.env.AGE_VERIFICATION_PROVIDER === "yoti") {
    return NextResponse.json({ error: "Mock verification is not available." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { outcome?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.outcome !== "passed" && body.outcome !== "failed") {
    return NextResponse.json({ error: "outcome must be 'passed' or 'failed'." }, { status: 422 });
  }

  const row = await prisma.ageVerification.findUnique({ where: { providerSessionId: params.sessionId } });
  if (!row || row.userId !== user.id) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ ok: true }); // already resolved, same no-op posture as the real flow
  }

  await prisma.ageVerification.update({
    where: { id: row.id },
    data: { status: body.outcome, method: "mock" },
  });

  return NextResponse.json({ ok: true });
}
