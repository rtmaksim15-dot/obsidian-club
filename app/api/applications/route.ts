import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { track } from "@/lib/analytics/track";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

// POST /api/applications — the invitation panel's intake (Invitation
// Panel flow, A2, 2026-08-2x, see DECISIONS.md). Writes to the same
// `Waitlist` table as the older landing-page form (`/api/waitlist`) so
// the admin review queue stays unified (A4) — this route is additive,
// not a replacement; `/api/waitlist` is untouched.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_ANSWER_LENGTH = 20;

// Same shape/reasoning as /api/waitlist's rate limit — a public,
// unauthenticated endpoint.
const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

type Body = {
  name?: string;
  email?: string;
  city?: string;
  ageConfirmed?: boolean;
  answer?: string;
};

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(`applications:${getClientIp(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many applications from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const city = body.city?.trim() || null;
  const answer = body.answer?.trim();

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }
  if (!body.ageConfirmed) {
    return NextResponse.json({ error: "You must confirm you are at least 18 years old." }, { status: 422 });
  }
  if (!answer || answer.length < MIN_ANSWER_LENGTH) {
    return NextResponse.json({ error: `Please write at least ${MIN_ANSWER_LENGTH} characters.` }, { status: 422 });
  }

  try {
    await prisma.waitlist.create({
      data: { email, name, city, reason: answer, origin: "card" },
    });
    // Duplicate email is handled in the catch block below as an
    // idempotent success — only a genuine new row counts as a real
    // submission for analytics.
    await track({ userId: null, type: "waitlist.submitted", meta: { origin: "card" } });
  } catch (err) {
    // Same privacy-preserving idempotency as /api/waitlist (ADR-0005):
    // a duplicate email is treated as success, not an error, so this
    // public endpoint never confirms "that email already applied."
    const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) {
      console.error("[applications] Failed to store application:", err);
      return NextResponse.json({ error: "The club could not be reached. Try again shortly." }, { status: 503 });
    }
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
