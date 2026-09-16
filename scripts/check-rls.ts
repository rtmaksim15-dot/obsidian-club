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

  await checkRoomLevelGateTripwire(prisma);

  await prisma.$disconnect();
}

// Tripwire (2026-09-15, see DECISIONS.md): `messages`' own Realtime
// SELECT policy is `auth.uid() is not null` — confirmed live to not
// evaluate joins reliably (see the 2026-08-04 migration), so it can
// only ever be this self-contained, never room.minLevel-aware. Today
// every room has minLevel 1, so that's a harmless gap in practice. The
// day anyone raises a room's minLevel above 1 (Houses/Levels are the
// named next priority in CLAUDE.md) without first closing this, any
// authenticated member — any level — can subscribe to that room's raw
// postgres_changes channel and read its live content, bypassing
// canAccessRoom() entirely. This check fails loudly at exactly that
// moment instead of relying on someone remembering a comment.
async function checkRoomLevelGateTripwire(prisma: InstanceType<typeof import("@prisma/client").PrismaClient>) {
  const elevatedRooms = await prisma.$queryRaw<{ slug: string; name: string; min_level: number; is_active: boolean }[]>`
    select slug, name, min_level, is_active from rooms where min_level > 1 order by slug;
  `;
  if (elevatedRooms.length === 0) return;

  const policies = await prisma.$queryRaw<{ qual: string | null }[]>`
    select qual from pg_policies where tablename = 'messages' and cmd = 'SELECT';
  `;
  const policyText = policies.map((p) => p.qual ?? "").join(" ");
  const enforcesLevelGate = /min_level/i.test(policyText);
  if (enforcesLevelGate) return;

  console.error(
    "\nRLS TRIPWIRE: room-level access gate not enforced by Realtime.\n\n" +
      "The following room(s) have minLevel > 1 (a real access restriction " +
      "canAccessRoom() enforces in application code):\n\n" +
      elevatedRooms.map((r) => `  - ${r.slug} (minLevel ${r.min_level}, isActive: ${r.is_active})`).join("\n") +
      "\n\nBut messages' own Realtime SELECT policy is " +
      `"${policyText.trim() || "(no SELECT policy found)"}" — it does not ` +
      "reference min_level at all, so it cannot be enforcing this gate. " +
      "Realtime authorizes postgres_changes delivery directly against this " +
      "policy, never through this app's API routes: right now, any " +
      "authenticated member — regardless of level — can subscribe to the " +
      "raw channel for one of these rooms and receive its live message " +
      "content, bypassing canAccessRoom() entirely.\n\n" +
      "This was harmless while every room's minLevel was 1; it stops being " +
      "harmless the moment any room above is reactivated or its minLevel is " +
      "raised for real. Fix needed before that happens: denormalize the " +
      "gate onto `messages` itself the same way direct_messages denormalizes " +
      "participant_a_id/b_id (see supabase/migrations/20260914000000_rls_" +
      "direct_messages.sql) — e.g. a `min_level` column copied from the " +
      "room at message-insert time — so the policy can stay join-free " +
      "(Realtime doesn't evaluate joins reliably) while actually checking " +
      "it, then update messages_select_authenticated to reference it. Do " +
      "not just add a join to rooms; that policy has already been proven " +
      "not to fire for Realtime.",
  );
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
