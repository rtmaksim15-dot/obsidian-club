import fs from "fs";
import path from "path";

// Safety check (added 2026-08-06, after the URGENT RLS gap found
// 2026-07-16 and finally closed 2026-08-04 — see TECH_DEBT.md and
// supabase/migrations/20260804090000_rls_sweep_remaining_tables.sql):
// a `prisma db push` that adds a new table, or a manual `alter table
// ... disable row level security`, gives that table zero protection by
// default — nothing in this codebase's own access control
// (requireAdmin(), getCurrentUser(), middleware route-gating) touches
// Postgres directly, so RLS is the *only* thing standing between the
// public NEXT_PUBLIC_SUPABASE_ANON_KEY and the whole database. This
// script is the trip-wire for that regression happening silently again.
// Run it after every `prisma db push` / schema migration — see
// CLAUDE.md's rules.

// Local dev: .env.local holds the real DATABASE_URL (per
// .env.example's own comment: "Real values go in .env.local... which
// overrides these at runtime"); .env only has committed placeholders.
// Loaded here — before `@prisma/client` is imported — because
// `@prisma/client` auto-loads `.env` as a side effect of the import
// itself, which (being a static import) is hoisted ahead of any
// top-level code in this file; loading .env.local afterward would be
// too late to win. A dynamic import() after this block is what makes
// the ordering actually work. In CI/Vercel, DATABASE_URL is already a
// real environment variable and this whole block is a no-op (no
// .env.local file exists there).
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
    if (match) process.env[match[1]] = match[2];
  }
}

type TableRlsRow = { table: string; rls_enabled: boolean };

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const tables = await prisma.$queryRaw<TableRlsRow[]>`
    select relname as table, relrowsecurity as rls_enabled
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public' and relkind = 'r'
    order by relname;
  `;

  const disabled = tables.filter((t) => !t.rls_enabled);

  console.log(`Checked ${tables.length} table(s) in the public schema.`);

  if (disabled.length > 0) {
    console.error("\nRLS is DISABLED on the following table(s):\n");
    disabled.forEach((t) => console.error(`  - ${t.table}`));
    console.error(
      "\nAnyone with the public NEXT_PUBLIC_SUPABASE_ANON_KEY can read and " +
        "write these tables directly via Supabase's REST API — this bypasses " +
        "every access check in this codebase entirely (none of it touches " +
        "Postgres directly). Fix:\n\n" +
        disabled.map((t) => `  alter table ${t.table} enable row level security;`).join("\n") +
        "\n\nIf the table is one a browser-side Supabase client (Realtime, " +
        "direct queries) needs to read, it also needs a real policy — not " +
        "just enable-with-no-policies (deny-all). See messages' policy in " +
        "supabase/migrations/20260804090000_rls_sweep_remaining_tables.sql " +
        "for a worked example, and that migration's comments for a real " +
        "gotcha (Realtime doesn't evaluate policies that join to other " +
        "tables).",
    );
    process.exitCode = 1;
  } else {
    console.log("RLS is enabled on every table.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
