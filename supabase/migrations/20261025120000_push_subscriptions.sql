-- Web Push, Package N1 (2026-10-25, see DECISIONS.md)
--
-- WRITTEN, NOT APPLIED — per CLAUDE.md rule 11, awaiting explicit
-- go-ahead naming this exact action.
--
-- push_subscriptions — one row per subscribed device/browser. endpoint
-- is unique by definition (the push service's own per-subscription
-- URL — no two subscriptions ever share one); p256dh/auth are the
-- subscription's public key and auth secret, required by the Web Push
-- protocol to encrypt a payload only that one subscription can
-- decrypt. user_agent_short is a short parsed summary ("Chrome on
-- macOS," lib/security/user-agent.ts), not the raw header — same
-- pattern admin_access_log already established.

create table push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  endpoint          text not null unique,
  p256dh            text not null,
  auth              text not null,
  user_agent_short  text not null,
  created_at        timestamptz not null default now(),
  last_used_at      timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

-- RLS — deny-all (see supabase/migrations/20260911000000_rls_admin_notes.sql
-- for the identical, established precedent): only ever read/written via
-- Prisma, server-side (POST /api/push/subscribe and /api/push/
-- unsubscribe write it; lib/push/send.ts reads it and deletes a row on
-- a 404/410 from the push service), never a browser-side Supabase
-- client, never subscribed to via Realtime.

alter table push_subscriptions enable row level security;
