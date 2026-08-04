import "server-only";
import { PrismaClient } from "@prisma/client";

// Single Prisma instance across hot-reloads in dev (Next.js best practice).
// `import "server-only"` (August hardening pass, Block 2, 2026-08-04):
// this holds DATABASE_URL access and bypasses RLS entirely — same
// build-time guard as lib/auth/supabase-admin.ts and
// lib/analytics/track.ts, for the same reason.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
