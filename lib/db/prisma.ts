import "server-only";
import { PrismaClient } from "@prisma/client";

// Connection-pool exhaustion (Supavisor's own "max clients reached" and
// Prisma's own "Timed out fetching a new connection from the pool") reads
// as a generic PrismaClientUnknownRequestError/PrismaClientInitializationError
// everywhere it's thrown — indistinguishable in logs from an actual app bug.
// Tagging it here, once, means it's greppable/alertable without touching
// every call site (2026-09-23, connection-scaling pass).
function isPoolExhaustionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /EMAXCONNSESSION|max clients reached|pool_size|Timed out fetching a new connection from the (connection )?pool/i.test(
    message
  );
}

function withPoolLogging(client: PrismaClient) {
  return client.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (err) {
          if (isPoolExhaustionError(err)) {
            console.error(`[DB_POOL_EXHAUSTED] ${model ?? "raw"}.${operation} rejected — connection pool saturated`, err);
          }
          throw err;
        }
      },
    },
  });
}

// Single Prisma instance across hot-reloads in dev (Next.js best practice).
// `import "server-only"` (August hardening pass, Block 2, 2026-08-04):
// this holds DATABASE_URL access and bypasses RLS entirely — same
// build-time guard as lib/auth/supabase-admin.ts and
// lib/analytics/track.ts, for the same reason.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof withPoolLogging> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  withPoolLogging(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    })
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
