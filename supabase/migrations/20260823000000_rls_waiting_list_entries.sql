-- Caught by scripts/check-rls.ts immediately after prisma db push added
-- waiting_list_entries (landing-page pivot, 2026-08-23 — see
-- DECISIONS.md). Deny-all is correct: only ever written by
-- POST /api/waiting-list and read by the /admin waiting-list count/list
-- — always server-side via Prisma, never by a browser-side Supabase
-- client.

alter table waiting_list_entries enable row level security;
