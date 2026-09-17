-- Landing email capture + admin auth event log (2026-09-17, see
-- DECISIONS.md). Both deny-all: neither is ever read by a browser-side
-- Supabase client. email_captures is written only by POST /api/apply-
-- interest (server-side, service of DATABASE_URL which has BYPASSRLS —
-- see the 2026-08-04 RLS sweep migration's own note on this). Its
-- read-only admin-console listing goes through Prisma too, never a
-- direct Supabase client call. admin_auth_events is written only by the
-- server-side sign-in/MFA routes and read only by whatever future admin
-- view surfaces it (none does yet in this pass).

alter table email_captures    enable row level security;
alter table admin_auth_events enable row level security;
