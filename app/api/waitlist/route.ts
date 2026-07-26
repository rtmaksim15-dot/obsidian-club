import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendWaitlistConfirmation } from "@/lib/utils/email";
import { track } from "@/lib/analytics/track";

// Waitlist intake (Landing Page, Section 5).

type WaitlistPayload = {
  name?: string;
  email?: string;
  age?: string;
  city?: string;
  source?: string;
  reason?: string;
  referralCode?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: WaitlistPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const age = body.age ? Number(body.age) : NaN;
  const city = body.city?.trim() || null;
  const source = body.source?.trim() || null;
  const reason = body.reason?.trim() || null;
  const referralCode = body.referralCode?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }
  if (!Number.isFinite(age) || age < 18) {
    return NextResponse.json({ error: "You must be 18 or older." }, { status: 422 });
  }

  try {
    await prisma.waitlist.create({
      data: { email, name, age, city, source, reason, referralCode },
    });
    // Only on a genuine new application — not the duplicate/idempotent
    // path below, which isn't a real new submission.
    await track({ userId: null, type: "waitlist.submitted", meta: { source } });
  } catch (err) {
    // Duplicate application: treat as success (idempotent, no email
    // enumeration) rather than telling the caller the email already exists.
    const isDuplicate =
      err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
    if (!isDuplicate) {
      console.error("[waitlist] Failed to store application:", err);
      return NextResponse.json(
        { error: "The club could not be reached. Try again shortly." },
        { status: 503 }
      );
    }
  }

  await sendWaitlistConfirmation(email, name);

  return NextResponse.json({ ok: true }, { status: 201 });
}
