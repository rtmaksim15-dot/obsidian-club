import "server-only";
import { prisma } from "@/lib/db/prisma";
import { track } from "@/lib/analytics/track";
import { logModerationAction } from "@/lib/moderation/log";
import { isRedLineCategory } from "@/lib/moderation/report";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";
import { mockProvider } from "./mock";
import { yotiProvider } from "./yoti";
import type { AgeVerificationProvider } from "./types";
import type { AgeVerificationProvider as AgeVerificationProviderName } from "@prisma/client";

export const AGE_VERIFICATION_ENABLED = process.env.AGE_VERIFICATION_ENABLED === "true";

// A3: "mock throws at startup if NODE_ENV=production" — enforced here,
// the one place every caller funnels through, rather than trusting
// every call site to remember.
function activeProviderName(): AgeVerificationProviderName {
  const configured = process.env.AGE_VERIFICATION_PROVIDER === "yoti" ? "yoti" : "mock";
  if (configured === "mock" && process.env.NODE_ENV === "production") {
    throw new Error("[age-verification] AGE_VERIFICATION_PROVIDER=mock is not allowed when NODE_ENV=production.");
  }
  return configured;
}

function providerFor(name: AgeVerificationProviderName): AgeVerificationProvider {
  return name === "yoti" ? yotiProvider : mockProvider;
}

function ageEstimationThreshold(): number {
  const raw = process.env.AGE_ESTIMATION_THRESHOLD;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

// A8: lock new attempts after 3 failures. Based on a count of this
// user's `failed` rows only — `expired`/`cancelled` (e.g. the member
// just closed the tab) never count against them.
const LOCKOUT_THRESHOLD = 3;

export async function getFailedAttemptCount(userId: string): Promise<number> {
  return prisma.ageVerification.count({ where: { userId, status: "failed" } });
}

export async function isLocked(userId: string): Promise<boolean> {
  return (await getFailedAttemptCount(userId)) >= LOCKOUT_THRESHOLD;
}

export type StartResult = { locked: true } | { locked: false; redirectUrl: string };

// POST /api/age-verification/start's actual logic. Creates the
// provider session AND the local AgeVerification row together — if
// either half fails, nothing should be half-written, but a provider
// outage after our own row is created just leaves a `pending` row an
// admin can see; it never gets silently lost.
export async function startVerification(userId: string): Promise<StartResult> {
  if (await isLocked(userId)) {
    return { locked: true };
  }

  const providerName = activeProviderName();
  const provider = providerFor(providerName);
  const { sessionId, redirectUrl } = await provider.createSession(userId);

  const attemptNumber = (await prisma.ageVerification.count({ where: { userId } })) + 1;

  await prisma.ageVerification.create({
    data: {
      userId,
      provider: providerName,
      providerSessionId: sessionId,
      status: "pending",
      threshold: MIN_MEMBER_AGE,
      attemptNumber,
    },
  });

  await track({ userId, type: "age_verification.started", meta: { provider: providerName, attemptNumber } });

  return { locked: false, redirectUrl };
}

async function applyPass(userId: string, providerName: AgeVerificationProviderName): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { ageVerified: true, ageVerifiedAt: new Date(), ageVerifiedThreshold: MIN_MEMBER_AGE },
  });
  await logModerationAction({
    actorLabel: `system:${providerName}`,
    action: "member.age_verified_changed",
    targetType: "user",
    targetId: userId,
    note: `ageVerified: false -> true (system:${providerName})`,
  });
}

// A8: "create an item in the existing moderation queue. Never
// auto-ban." The existing queue is the Report table (Admin Console,
// Arbitration zone — see the Phase A report for how this was
// confirmed). `below_membership_age` is an existing, non-red-line
// ReportCategory that already means exactly this ("member appears to
// be under the club's minimum membership age — not a child-safety
// concern") — reused as-is rather than adding a new enum value.
// Self-filed (reporterId = the member themselves): this bypasses
// POST /api/reports' own "you can't report your own profile" guard on
// purpose — that guard exists to stop members gaming self-reports, not
// to block this system-side path, which writes directly via Prisma the
// same way the admin reports route does.
async function maybeCreateLockoutReport(userId: string): Promise<void> {
  const existing = await prisma.report.findFirst({
    where: { targetType: "profile", targetId: userId, category: "below_membership_age", status: "open" },
    select: { id: true },
  });
  if (existing) return;

  const category = "below_membership_age" as const;
  await prisma.report.create({
    data: {
      targetType: "profile",
      targetId: userId,
      reporterId: userId,
      category,
      isRedLine: isRedLineCategory(category),
      note: `Age verification locked after ${LOCKOUT_THRESHOLD} failed attempts.`,
    },
  });
}

// Shared by GET /verify/return and POST /api/age-verification/webhook
// — both ultimately just need "go find out what this session's result
// actually is now, and apply it exactly once." Idempotent: a session
// already resolved (not `pending`) is returned as-is with no further
// writes, which is what makes a duplicate webhook delivery a no-op.
export async function recordVerificationResult(providerSessionId: string) {
  const row = await prisma.ageVerification.findUnique({ where: { providerSessionId } });
  if (!row) return null;
  if (row.status !== "pending") return row;

  const provider = providerFor(row.provider);
  const result = await provider.getResult(providerSessionId);
  if (result.status === "pending") return row;

  const threshold = result.method === "age_estimation" ? ageEstimationThreshold() : MIN_MEMBER_AGE;

  const updated = await prisma.ageVerification.update({
    where: { id: row.id },
    data: { status: result.status, method: result.method ?? null, threshold, completedAt: new Date() },
  });

  if (result.status === "passed") {
    await applyPass(row.userId, row.provider);
    await track({ userId: row.userId, type: "age_verification.passed", meta: { provider: row.provider } });
  } else if (result.status === "failed") {
    await track({ userId: row.userId, type: "age_verification.failed", meta: { provider: row.provider } });
    if (await isLocked(row.userId)) {
      await maybeCreateLockoutReport(row.userId);
      await track({ userId: row.userId, type: "age_verification.locked", meta: { provider: row.provider } });
    }
  }

  return updated;
}
