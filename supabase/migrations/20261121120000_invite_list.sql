-- Invite list reconciliation, 2026-11-21 (see DECISIONS.md)
--
-- WRITTEN, NOT APPLIED — per CLAUDE.md rule 11, awaiting explicit
-- go-ahead naming this exact action.
--
-- invite_list — the 907-row buyer list emailed invitations on
-- 2026-11-21. No FK to users — a row exists whether or not that
-- person ever registers; matching to a real User is done at query
-- time by lowercased email (lib/invites/matching.ts), not a stored
-- relation. Customer PII, imported once from a one-off CSV
-- (scripts/import-invite-list.ts) — deny-all RLS, same as every other
-- admin-only/service-role-only table in this schema.

create table invite_list (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  first_name text,
  last_name  text,
  country    text,
  source     text not null default 'obsidian-buyers',
  batch      text not null default '2026-11-21',
  created_at timestamptz not null default now()
);

-- RLS — deny-all (see supabase/migrations/20260911000000_rls_admin_notes.sql
-- for the identical, established precedent): only ever read/written via
-- Prisma, server-side (scripts/import-invite-list.ts writes it;
-- app/(platform)/admin/invites/page.tsx reads it), never a
-- browser-side Supabase client, never subscribed to via Realtime, no
-- anon/authenticated policies of any kind.

alter table invite_list enable row level security;
