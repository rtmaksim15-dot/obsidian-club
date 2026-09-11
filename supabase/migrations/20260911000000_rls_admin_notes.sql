-- Caught by scripts/check-rls.ts immediately after prisma db push added
-- admin_notes (Admin Console Notes, 2026-09-11). Deny-all is correct:
-- only ever read/written via Prisma from the admin console (Zone 2,
-- People), never by a browser-side Supabase client.

alter table admin_notes enable row level security;
