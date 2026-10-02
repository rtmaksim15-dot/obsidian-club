import fs from "fs";
import path from "path";
import { COUNCIL_THRESHOLD, titleFor } from "../lib/rep/config";

/**
 * REP ×10 scale migration (package 1b, 2026-10-01, see DECISIONS.md).
 *
 * Thresholds in lib/rep/config.ts#REP_TITLES are ×10 the old system's
 * values, so without this every live member is Initiate. Appends exactly
 * one new `rep_history` row per user — delta = 9 × their current ledger
 * sum, so old + 9×old = 10×old — rather than editing any existing row.
 * `category: "ADJUSTMENT"`, `reasonCode: "scale_migration"`, idempotent
 * per user via the same `(userId, sourceType, sourceId, reasonCode)`
 * uniqueness lib/rep/ledger.ts relies on (sourceId = the user's own id,
 * since there's exactly one of these per user, ever).
 *
 * Does NOT import lib/rep/ledger.ts despite package 1b's "single writer"
 * goal: that module's first line is `import "server-only"`, which throws
 * immediately outside Next.js's bundler (see lib/rep/ledger.test.ts's own
 * comment on the same issue) — fatal to a plain `tsx` script. Every write
 * below is shaped to be byte-for-byte what `ledger.ts#applyAdjustment` +
 * `recomputeUser` would have produced (same columns, same idempotency
 * key, same repExempt handling) — reimplemented here because it must run
 * standalone, not because the logic is meant to diverge. If either
 * function's behavior changes, check this file stays in sync.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/rep-scale-migrate.ts            # dry-run (default)
 *   node --env-file=.env.local --import tsx scripts/rep-scale-migrate.ts --apply    # real writes
 */

const LORD_OBSIDIAN_EMAIL = "lord.obsidian.oc@gmail.com";
const SCALE_REASON_CODE = "scale_migration";
const SCALE_SOURCE_TYPE = "scale_migration";

export type UserRow = {
  id: string;
  email: string;
  rep: number;
  titleLevel: number;
  councilEligible: boolean;
  repExempt: boolean;
};

export type PlanRow = {
  email: string;
  oldRep: number;
  newRep: number;
  newTitle: string;
  willBeExempt: boolean;
  skipped: boolean;
};

/** Pure — no DB access. What --dry-run prints, and what --apply is about
 * to do, for one user given their true current ledger sum. */
export function planForUser(user: Pick<UserRow, "email">, currentSum: number): PlanRow {
  if (currentSum <= 0) {
    return { email: user.email, oldRep: currentSum, newRep: currentSum, newTitle: titleFor(currentSum).name, willBeExempt: false, skipped: true };
  }
  const willBeExempt = user.email === LORD_OBSIDIAN_EMAIL;
  const newRep = currentSum * 10;
  return {
    email: user.email,
    oldRep: currentSum,
    newRep,
    newTitle: willBeExempt ? "(exempt — no title)" : titleFor(newRep).name,
    willBeExempt,
    skipped: false,
  };
}

// Minimal shape of the Prisma Client this script actually calls — avoids
// importing the real `@prisma/client` types at the top level so this file
// can be imported by a test with a fake in place of them. Concrete
// parameter shapes (not `unknown`) so an object-literal fake implementing
// this type gets its callback parameters inferred, with no `any` needed.
export type MigratePrisma = {
  repHistory: {
    findUnique: (args: {
      where: { userId_sourceType_sourceId_reasonCode: { userId: string; sourceType: string; sourceId: string; reasonCode: string } };
    }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    aggregate: (args: { where: { userId: string } }) => Promise<{ _sum: { delta: number | null } }>;
  };
  user: {
    update: (args: {
      where: { id: string };
      data: Partial<Pick<UserRow, "titleLevel" | "councilEligible" | "repExempt">> & { rep?: number | { increment: number } };
    }) => Promise<unknown>;
    findUniqueOrThrow: (args: { where: { id: string } }) => Promise<{ titleLevel: number; councilEligible: boolean; repExempt: boolean }>;
  };
  $transaction: <T>(fn: (tx: MigratePrisma) => Promise<T>) => Promise<T>;
};

/** --apply only. Idempotent: a second call for the same user is a no-op
 * (findUnique finds the row from the first call and returns early). */
export async function appendScaleMigrationRow(
  prisma: MigratePrisma,
  user: Pick<UserRow, "id" | "email">,
  currentSum: number,
): Promise<{ outcome: "skipped-zero" | "duplicate" | "applied"; delta: number }> {
  if (currentSum <= 0) return { outcome: "skipped-zero", delta: 0 };

  const delta = currentSum * 9;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.repHistory.findUnique({
      where: { userId_sourceType_sourceId_reasonCode: { userId: user.id, sourceType: SCALE_SOURCE_TYPE, sourceId: user.id, reasonCode: SCALE_REASON_CODE } },
    });
    if (existing) return { outcome: "duplicate", delta: 0 };

    await tx.repHistory.create({
      data: {
        userId: user.id,
        delta,
        reason: "REP scale migration (×10)",
        source: SCALE_SOURCE_TYPE,
        category: "ADJUSTMENT",
        baseDelta: delta,
        multiplier: 1,
        sourceType: SCALE_SOURCE_TYPE,
        sourceId: user.id,
        reasonCode: SCALE_REASON_CODE,
        note: `×10 scale migration: ${currentSum} -> ${currentSum * 10}`,
        grantedById: null,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { rep: { increment: delta } } });

    if (user.email === LORD_OBSIDIAN_EMAIL) {
      await tx.user.update({ where: { id: user.id }, data: { repExempt: true } });
    }

    return { outcome: "applied", delta };
  });
}

/** Mirrors lib/rep/ledger.ts#recomputeUser exactly (see that function) —
 * rebuilds `rep`/`titleLevel`/`councilEligible` from the full ledger sum,
 * skipping title/council for an exempt user. Run for every user after all
 * scale rows are appended, so a partially-applied prior run (some users
 * already migrated, some not) still ends up fully consistent. */
export async function recomputeUserLocal(prisma: MigratePrisma, userId: string): Promise<{ rep: number; titleLevel: number; councilEligible: boolean }> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.repHistory.aggregate({ where: { userId } });
    const rep = agg._sum.delta ?? 0;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.repExempt) {
      await tx.user.update({ where: { id: userId }, data: { rep } });
      return { rep, titleLevel: user.titleLevel, councilEligible: user.councilEligible };
    }

    const title = titleFor(rep);
    const titleLevel = Math.max(user.titleLevel, title.level);
    const councilEligible = user.councilEligible || rep >= COUNCIL_THRESHOLD;
    await tx.user.update({ where: { id: userId }, data: { rep, titleLevel, councilEligible } });
    return { rep, titleLevel, councilEligible };
  });
}

/** Writes a timestamped JSON snapshot of rep_history + users(id,email,rep)
 * to a directory OUTSIDE this repo (a sibling of the project root) —
 * never committed, never inside the git-tracked tree. Called before any
 * --apply write. Returns the file path written. */
export async function writeBackup(prisma: {
  repHistory: { findMany: (args: unknown) => Promise<unknown[]> };
  user: { findMany: (args: unknown) => Promise<unknown[]> };
}): Promise<string> {
  const backupDir = path.resolve(process.cwd(), "..", "obsidian-club-backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const [repHistory, users] = await Promise.all([
    prisma.repHistory.findMany({}),
    prisma.user.findMany({ select: { id: true, email: true, rep: true } }),
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(backupDir, `${timestamp}-rep-scale-migrate-backup.json`);
  fs.writeFileSync(filePath, JSON.stringify({ takenAt: new Date().toISOString(), repHistory, users }, null, 2));
  return filePath;
}

async function main() {
  const apply = process.argv.includes("--apply");

  // Same manual .env.local load as scripts/check-rls.ts, and for the same
  // reason: must happen before @prisma/client's own import-time .env
  // auto-load, which a static top-level import would hoist ahead of this.
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
      if (match) process.env[match[1]] = match[2];
    }
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient() as unknown as MigratePrisma & {
    repHistory: MigratePrisma["repHistory"] & { findMany: (args: unknown) => Promise<unknown[]>; groupBy: (args: unknown) => Promise<{ userId: string; _sum: { delta: number | null } }[]> };
    user: MigratePrisma["user"] & { findMany: (args: unknown) => Promise<UserRow[]> };
    $disconnect: () => Promise<void>;
  };

  try {
    console.log(apply ? "Running in --apply mode (real writes)." : "Running in --dry-run mode (read-only, default).");

    const users = await prisma.user.findMany({
      select: { id: true, email: true, rep: true, titleLevel: true, councilEligible: true, repExempt: true },
    });
    const sums = await prisma.repHistory.groupBy({ by: ["userId"], _sum: { delta: true } });
    const sumByUser = new Map(sums.map((s) => [s.userId, s._sum.delta ?? 0]));

    if (!apply) {
      console.log("\nemail | old rep -> new rep | new title | rep_exempt");
      for (const user of users) {
        const currentSum = sumByUser.get(user.id) ?? 0;
        const plan = planForUser(user, currentSum);
        const skippedNote = plan.skipped ? " (skipped — no REP to scale)" : "";
        console.log(`${plan.email} | ${plan.oldRep} -> ${plan.newRep} | ${plan.newTitle} | ${plan.willBeExempt}${skippedNote}`);
      }
      console.log("\nDry run only — no writes made. Re-run with --apply to actually migrate (after a 'go').");
      return;
    }

    const backupPath = await writeBackup(prisma);
    console.log(`Backup written to ${backupPath}`);

    for (const user of users) {
      const currentSum = sumByUser.get(user.id) ?? 0;
      const result = await appendScaleMigrationRow(prisma, user, currentSum);
      console.log(`${user.email}: ${result.outcome}${result.delta ? ` (+${result.delta})` : ""}`);
    }

    for (const user of users) {
      const recomputed = await recomputeUserLocal(prisma, user.id);
      console.log(`${user.email}: recomputed rep=${recomputed.rep} titleLevel=${recomputed.titleLevel} councilEligible=${recomputed.councilEligible}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
