import { NextResponse } from "next/server";

// Waitlist intake (Landing Page, Section 5).
// NOTE: Stage 1 / Week 2 wires persistence (Supabase `waitlist` table via
// Prisma) and the confirmation email (Resend). For now this validates input
// and acknowledges — it does NOT store anything yet.

type WaitlistPayload = {
  name?: string;
  email?: string;
  age?: string;
  city?: string;
  source?: string;
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

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }
  if (!Number.isFinite(age) || age < 18) {
    return NextResponse.json({ error: "You must be 18 or older." }, { status: 422 });
  }

  // TODO (Week 2): persist + notify.
  //   import { prisma } from "@/lib/db/prisma";
  //   await prisma.waitlist.create({
  //     data: { email, name, referralCode: body.referralCode?.trim() || null },
  //   });
  //   await sendConfirmationEmail(email);  // Resend

  return NextResponse.json({ ok: true }, { status: 201 });
}
