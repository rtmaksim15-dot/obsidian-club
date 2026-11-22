// Invite list reconciliation, 2026-11-21 (see DECISIONS.md). One-off
// importer for the 907-row buyer CSV (columns: Email, First Name,
// Last Name, Country) into invite_list. Idempotent — safe to re-run
// against the same or an updated file; matches existing rows by
// email, never duplicates.
//
// CLAUDE.md rule 12, extended to customer PII for this task: never
// print an email or name to the terminal, on success OR failure.
// Output is counts only.
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { normalizeEmail, normalizeOptionalField } from "../lib/invites/matching";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

type CsvRow = { Email?: string; "First Name"?: string; "Last Name"?: string; Country?: string };

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: tsx scripts/import-invite-list.ts <path-to-csv>");
    process.exit(1);
  }
  const resolvedPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(resolvedPath, "utf8");
  const rows: CsvRow[] = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    for (const row of rows) {
      const rawEmail = row.Email;
      if (!rawEmail || !rawEmail.includes("@")) {
        skipped++;
        continue;
      }
      const email = normalizeEmail(rawEmail);
      const firstName = normalizeOptionalField(row["First Name"]);
      const lastName = normalizeOptionalField(row["Last Name"]);
      const country = normalizeOptionalField(row.Country);

      const existing = await prisma.inviteListEntry.findUnique({ where: { email }, select: { id: true } });

      await prisma.inviteListEntry.upsert({
        where: { email },
        create: { email, firstName, lastName, country },
        update: { firstName, lastName, country },
      });

      if (existing) updated++;
      else inserted++;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Rows read: ${rows.length}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no valid email): ${skipped}`);
}

main().catch((err) => {
  console.error("Import failed:", err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
