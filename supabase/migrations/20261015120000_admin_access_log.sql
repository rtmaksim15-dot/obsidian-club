-- Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md)
--
-- WRITTEN, NOT APPLIED — per CLAUDE.md rule 11, awaiting explicit
-- go-ahead naming this exact action.
--
-- admin_access_log — a lower-sensitivity "who's accessed /admin
-- lately" log, distinct from the existing admin_auth_events (the
-- sign-in/MFA-attempt audit trail, success AND failure, raw IP, used
-- for the alert-email logic). One row per successful step-up (a real
-- TOTP re-verification, POST /api/auth/mfa/verify), not per page view
-- or API call — ip_hash is a one-way HMAC (lib/security/ip-hash.ts,
-- keyed with the new ADMIN_SESSION_SECRET), not a raw address, and
-- user_agent is a short parsed summary ("Chrome on macOS," lib/
-- security/user-agent.ts), not the raw header — this table's purpose
-- is a quick glance in the admin console (last 20 entries), not a
-- forensic record.

create table admin_access_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  at         timestamptz not null default now(),
  ip_hash    text not null,
  user_agent text not null
);

create index admin_access_log_user_id_at_idx on admin_access_log(user_id, at);
create index admin_access_log_at_idx on admin_access_log(at);

-- RLS — deny-all (see supabase/migrations/20260911000000_rls_admin_notes.sql
-- for the identical, established precedent): only ever read/written via
-- Prisma, server-side (POST /api/auth/mfa/verify writes it; the admin
-- console's own page.tsx reads it), never a browser-side Supabase
-- client, never subscribed to via Realtime.

alter table admin_access_log enable row level security;
