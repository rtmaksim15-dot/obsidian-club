import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

// POST /api/join/resolve-code — resolves a printed OBS-XXXX-XXXX short
// code to its full token, for the manual-entry fallback at /join when
// scanning the QR isn't possible (batch generator v2, 2026-08-14).
// Tighter than the 10/hr redemption rate limit: this endpoint is a
// bare existence check with a much smaller keyspace than the 48-hex
// token (charset of 32, 8 characters — still ~10^12 combinations, but
// this is the first line of defense against enumerating it, not the
// only one).
const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

type Body = { shortCode?: string };

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(`join-resolve-code:${getClientIp(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const shortCode = body.shortCode?.trim().toUpperCase();
  if (!shortCode) {
    return NextResponse.json({ error: "Enter a code." }, { status: 422 });
  }

  const invite = await prisma.inviteToken.findUnique({
    where: { shortCode },
    select: { token: true },
  });
  if (!invite) {
    return NextResponse.json({ error: "That code wasn't found." }, { status: 404 });
  }

  return NextResponse.json({ token: invite.token });
}
