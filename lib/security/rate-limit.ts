import "server-only";
import { prisma } from "@/lib/db/prisma";

// DB-backed rate limiting (August hardening pass, Block 2, 2026-08-04)
// — see prisma/schema.prisma's RateLimitHit comment for why this isn't
// Upstash/Redis. Fixed-window, not sliding-window: simple, and more
// than sufficient for blocking the kind of abuse these auth-sensitive
// endpoints actually face at this project's scale.
type RateLimitOptions = {
  max: number;
  windowMs: number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

// Cheap, non-blocking best-effort cleanup — 1-in-50 calls sweeps hits
// older than an hour. No cron infra here; this keeps the table from
// growing unbounded without needing one.
async function maybeCleanup() {
  if (Math.random() > 0.02) return;
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch((err) => {
    console.error("[rate-limit] Cleanup failed (non-fatal):", err);
  });
}

export async function checkRateLimit(key: string, { max, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  const count = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } });
  if (count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  await prisma.rateLimitHit.create({ data: { key } });
  maybeCleanup();

  return { allowed: true };
}

// Vercel (and most reverse proxies) set x-forwarded-for to
// "client, proxy1, proxy2" — the first entry is the original client.
// Falls back to a constant so a missing header fails safe (still rate
// limited, just as one shared bucket) rather than throwing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
