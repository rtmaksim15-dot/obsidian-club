import fs from "fs";
import path from "path";

/**
 * Package 1d (2026-10-02, see DECISIONS.md) — sets `User.repExempt = true`
 * for the Lord Obsidian account. Idempotent: a second run finds it
 * already true and makes no write.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/set-lord-obsidian-rep-exempt.ts            # dry-run (default)
 *   node --env-file=.env.local --import tsx scripts/set-lord-obsidian-rep-exempt.ts --apply    # real write
 */

const LORD_OBSIDIAN_EMAIL = "lord.obsidian.oc@gmail.com";

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
  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({ where: { email: LORD_OBSIDIAN_EMAIL }, select: { id: true, email: true, repExempt: true } });
    if (!user) {
      console.log(`No user found with email ${LORD_OBSIDIAN_EMAIL} — nothing to do.`);
      return;
    }

    if (user.repExempt) {
      console.log(`${user.email} is already repExempt — no-op (idempotent).`);
      return;
    }

    if (!apply) {
      console.log(`[dry-run] Would set repExempt = true for ${user.email} (id ${user.id}). Re-run with --apply to write.`);
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { repExempt: true } });
    console.log(`Set repExempt = true for ${user.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
