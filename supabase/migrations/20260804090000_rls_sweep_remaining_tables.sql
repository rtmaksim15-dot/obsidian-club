-- August hardening pass (ROADMAP v3.1), Block 2: RLS sweep.
--
-- Closes the URGENT gap flagged in TECH_DEBT.md (found 2026-07-16):
-- every table except `waitlist`/`analytics_events` had RLS fully
-- disabled, meaning anyone with the (necessarily public)
-- NEXT_PUBLIC_SUPABASE_ANON_KEY could call Supabase's auto-generated
-- REST API directly and read/write any row, completely bypassing this
-- app's own access control (requireAdmin(), getCurrentUser(),
-- middleware route-gating) — none of which touches Postgres directly;
-- every real read/write in this codebase goes through Prisma via
-- DATABASE_URL, whose role has BYPASSRLS (confirmed live:
-- `select rolbypassrls from pg_roles where rolname = current_user` ->
-- true), so enabling RLS here changes nothing about how the app itself
-- behaves. Table/role GRANTs were also confirmed wide open (default
-- Supabase setup: `authenticated`/`anon` both had full SELECT/INSERT/
-- UPDATE/DELETE at the GRANT level on every table checked) — RLS was
-- genuinely the only thing standing between the anon key and the whole
-- database, and it was off.
--
-- Deny-all (RLS enabled, zero policies) is the correct fix for every
-- table below EXCEPT `messages`: confirmed by grepping the whole
-- codebase for `createBrowserClient`/`createClient(` and
-- `postgres_changes` that RoomChat.tsx is the ONLY place using the
-- browser-side (anon/authenticated) Supabase client for direct table
-- access — a Realtime subscription on `messages` INSERT events.
-- Realtime enforces RLS: it only delivers a change event if the
-- subscribing role could SELECT that row, so a deny-all policy there
-- would silently break live message updates. Every other table gets a
-- clean deny-all: nothing else in the codebase queries Postgres via the
-- anon/authenticated client.

alter table achievements        enable row level security;
alter table comments             enable row level security;
alter table event_attendees      enable row level security;
alter table events                enable row level security;
alter table follows               enable row level security;
alter table house_memberships     enable row level security;
alter table houses                enable row level security;
alter table invite_batches        enable row level security;
alter table invite_tokens         enable row level security;
alter table likes                 enable row level security;
alter table marketplace_items     enable row level security;
alter table messages              enable row level security;
alter table notifications         enable row level security;
alter table posts                 enable row level security;
alter table referrals             enable row level security;
alter table rep_history           enable row level security;
alter table reviews               enable row level security;
alter table rooms                 enable row level security;
alter table user_achievements     enable row level security;
alter table user_profiles         enable row level security;
alter table users                 enable row level security;
alter table vault_items           enable row level security;

-- `messages`: authenticated members only, deliberately NOT the
-- per-room canAccessRoom() logic (level gate + newcomers' room's
-- 30-day window) this policy was originally written to mirror exactly.
--
-- Confirmed live (2026-08-04) that Realtime's postgres_changes
-- authorization does not fire for a policy that joins out to other
-- tables: a policy identical to canAccessRoom() (exists(select 1 from
-- rooms r join users u on u.id = auth.uid() where ...)) never
-- delivered a single event, even though the exact same predicate
-- evaluates true when run as a direct SQL query. Swapping to
-- `using (true)` fired immediately, isolating the failure to
-- Realtime's authorization path specifically, not RLS/grants/session
-- auth (all independently confirmed fine — see components/shared/
-- RoomChat.tsx's comment for the full trail). `auth.uid() is not null`
-- is the middle ground: self-contained (no cross-table reference, so
-- Realtime can evaluate it), and still blocks the actual threat this
-- migration exists to close — anonymous/anon-key reads of `messages`
-- via Supabase's REST API. It does NOT reproduce canAccessRoom()'s
-- finer-grained per-room gate, but it doesn't need to: this policy only
-- controls whether the live "something changed" ping fires, never what
-- content a member actually sees. GET /api/rooms/:slug/messages (what
-- RoomChat.tsx calls on every ping) already enforces the real
-- canAccessRoom() check server-side. See DECISIONS.md, 2026-08-04.
create policy messages_select_authenticated on messages
  for select using (auth.uid() is not null);
