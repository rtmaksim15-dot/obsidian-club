-- Caught by scripts/check-rls.ts immediately after prisma db push added
-- reports, blocks, and moderation_actions (Member Protection mechanics,
-- pre-launch legal package, 2026-08-09). Deny-all is correct for all
-- three: only ever read/written via Prisma (app/api/reports,
-- app/api/users/[id]/block, admin report-review actions), never by a
-- browser-side Supabase client.

alter table reports enable row level security;
alter table blocks enable row level security;
alter table moderation_actions enable row level security;
