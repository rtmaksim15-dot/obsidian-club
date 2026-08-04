import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Steps a member can mark complete themselves from real content (Code of
// Conduct, Lord Obsidian's introduction, Safety & Respect Guidelines) —
// deliberately excludes "newcomerRoom", which is computed live from
// message history and can't be self-reported through this route.
const SELF_REPORTABLE_STEPS = ["codeOfConduct", "introMaterial", "safetyRules"] as const;
type SelfReportableStep = (typeof SELF_REPORTABLE_STEPS)[number];

type Body = { step?: string };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const step = body.step;
  if (!step || !SELF_REPORTABLE_STEPS.includes(step as SelfReportableStep)) {
    return NextResponse.json({ error: "Unknown or non-self-reportable ritual step." }, { status: 422 });
  }

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const progress = (profile?.ritualProgress ?? {}) as Record<string, unknown>;

  const updated = {
    ...progress,
    [step]: true,
    [`${step}At`]: new Date().toISOString(),
  } as Prisma.InputJsonValue;

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ritualProgress: updated },
    update: { ritualProgress: updated },
  });

  return NextResponse.json({ ok: true });
}
