import "server-only";
import { prisma } from "@/lib/db/prisma";
import { errCode } from "@/lib/utils/safe-error";

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
    console.error("[rate-limit] Cleanup failed (non-fatal):", errCode(err));
  });
}

export async function checkRateLimit(key: string, { max, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  // Fix 10 (2026-09-29, see DECISIONS.md) — count-then-create used to be
  // two separate round trips, so two near-simultaneous calls for the
  // same key could both read a count under `max` before either wrote,
  // letting both through (the exact race every other "read then insert"
  // guard in this codebase closes with a transaction — see e.g.
  // InviteToken redemption). pg_advisory_xact_lock(hashtext(key))
  // serializes concurrent callers for the SAME key only (different keys
  // never block each other): the second caller's lock acquisition waits
  // until the first's transaction commits, so its count read is
  // guaranteed to see the first's insert. No schema change needed —
  // hashtext() maps the string key onto Postgres's own bigint advisory
  // lock keyspace, and the lock releases automatically at transaction
  // end either way.
  const allowed = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const count = await tx.rateLimitHit.count({ where: { key, createdAt: { gte: windowStart } } });
    if (count >= max) return false;
    await tx.rateLimitHit.create({ data: { key } });
    return true;
  });

  if (!allowed) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

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
