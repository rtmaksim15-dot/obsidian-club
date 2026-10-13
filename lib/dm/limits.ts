import "server-only";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { prisma } from "@/lib/db/prisma";

// Outbound requests per sender per day, across all recipients (item 4,
// 2026-09-14) — reuses RateLimitHit/checkRateLimit (the same DB-backed
// limiter apply/register/join already use), keyed per sender rather
// than per IP. Sliding 24-hour window, not a calendar-day reset —
// simpler, no timezone to pick, and it's the infrastructure that
// already exists.
//
// Raised 5 -> 10 (Package 4, Phase A, 2026-10-13, see DECISIONS.md) —
// the task's own explicit number, now that My Boundaries gives a
// recipient a real way to close their door entirely (whoCanMessage/
// acceptRequests) rather than relying solely on this sender-side daily
// cap to keep volume manageable.
export const DAILY_REQUEST_LIMIT = 10;
const WINDOW_MS = 24 * 60 * 60 * 1000;

function limitKey(senderId: string): string {
  return `dm-request:${senderId}`;
}

export type DailyLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfterSeconds: number };

/** Call once per attempted request. Only increments the counter when it actually allows one through. */
export async function checkDailyRequestLimit(senderId: string): Promise<DailyLimitResult> {
  const key = limitKey(senderId);
  const result = await checkRateLimit(key, { max: DAILY_REQUEST_LIMIT, windowMs: WINDOW_MS });
  if (!result.allowed) {
    return { allowed: false, remaining: 0, retryAfterSeconds: result.retryAfterSeconds };
  }

  const usedInWindow = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: new Date(Date.now() - WINDOW_MS) } },
  });
  return { allowed: true, remaining: Math.max(0, DAILY_REQUEST_LIMIT - usedInWindow) };
}
