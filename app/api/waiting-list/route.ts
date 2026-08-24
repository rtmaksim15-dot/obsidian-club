import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

// POST /api/waiting-list — the landing page's quiet secondary path
// (landing-page pivot, 2026-08-23, see DECISIONS.md). Deliberately not
// an application: email only, no email sent back, no token ever minted.
// Writes to WaitingListEntry, not Waitlist — see that model's comment
// for why the two must never be conflated.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same shape/reasoning as the other public intake endpoints.
const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

type Body = { email?: string };

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(`waiting-list:${getClientIp(request)}`, RATE_LIMIT);
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

  const email = body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }

  try {
    await prisma.waitingListEntry.create({ data: { email } });
  } catch (err) {
    // Same privacy-preserving idempotency as /api/applications (ADR-0005)
    // — a duplicate email is success, not an error.
    const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) {
      console.error("[waiting-list] Failed to store entry:", err);
      return NextResponse.json({ error: "The club could not be reached. Try again shortly." }, { status: 503 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
