import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { hashIp } from "@/lib/security/hash-ip";

// POST /api/email-capture — the landing page's #apply secondary path
// (item 1, 2026-09-17, see DECISIONS.md). Replaces the retired
// /api/waiting-list. No email is ever sent to a captured address, and
// no review workflow exists — this route's only job is "write the row,
// or don't, and never let the response say which."
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };

// New / duplicate / invalid all take at least this long and return the
// exact same body and status — the only intentional exception is rate
// limiting, a distinct concern (abuse throttling, not per-submission
// enumeration) that gets its own 429. This isn't cryptographic
// constant-time — it's a practical padding to the slowest realistic
// path (a real insert), enough to defeat casual timing comparison
// without engineering for a threat model this endpoint doesn't have.
const MIN_RESPONSE_MS = 200;

type Body = { email?: string; website?: string };

export async function POST(request: NextRequest) {
  const start = Date.now();

  const rateLimit = await checkRateLimit(`email-capture:${getClientIp(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    // Falls through to the identical response below, same as any other
    // invalid submission.
  }

  // Honeypot: a real visitor never has anything here (the field is
  // hidden from sighted users and unreachable by tab order — see
  // EmailCaptureForm.tsx). A bot that fills every field it finds does.
  const isHoneypot = Boolean(body.website);
  const email = body.email?.trim().toLowerCase();
  const isValid = email !== undefined && email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email);

  if (isValid && !isHoneypot) {
    try {
      await prisma.emailCapture.create({ data: { email, hashedIp: hashIp(getClientIp(request)) } });
    } catch (err) {
      // A duplicate email is treated exactly like success — that's the
      // whole point of the identical response below, not a special case
      // to branch on.
      const isDuplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isDuplicate) {
        console.error("[email-capture] Failed to store entry:", err);
      }
    }
  }

  const elapsed = Date.now() - start;
  if (elapsed < MIN_RESPONSE_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
  }

  return NextResponse.json({ ok: true });
}
