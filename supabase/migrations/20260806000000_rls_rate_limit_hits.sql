-- Caught by scripts/check-rls.ts (added 2026-08-06) on its very first
-- run: `rate_limit_hits` (added in the same August hardening pass,
-- Block 2, 2026-08-04) never got RLS enabled — added after the sweep
-- migration, so it wasn't included in it. Exactly the silent-regression
-- scenario that script now exists to catch. Deny-all is correct here,
-- same as nearly every other table: this table is only ever read/written
-- via Prisma (lib/security/rate-limit.ts), never by a browser-side
-- Supabase client.

alter table rate_limit_hits enable row level security;
