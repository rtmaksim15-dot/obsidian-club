-- Enable Row Level Security across every `public` table that doesn't
-- already have it (only `waitlist` does, see TECH_DEBT.md's 2026-07-14
-- entry). Closes the gap where the public anon key could read/write any
-- table directly via Supabase's auto-generated REST API, bypassing this
-- app's own access control entirely (every real app read/write goes
-- through Prisma via `DATABASE_URL`, whose role has BYPASSRLS, so this
-- has never affected app behavior — see DECISIONS.md, 2026-07-16, and
-- ADR-0017).
--
-- Default posture: enable RLS with NO policy (deny-all for `anon` and
-- `authenticated`; the Prisma role keeps working because it has
-- BYPASSRLS). Three narrow allow-policies are added where the app
-- genuinely needs client-side Supabase access today:
--   1. `users` — a member can select their own row (needed so the
--      `messages` policy below can join against it).
--   2. `rooms` — authenticated members can select all rows (room
--      metadata — name/type/min_level — isn't sensitive; needed for the
--      same join).
--   3. `messages` — authenticated members can select messages in rooms
--      they can actually access, mirroring `lib/rating/room-access.ts`'s
--      `canAccessRoom()` exactly. This is the one policy that changes
--      real behavior if omitted: `components/shared/RoomChat.tsx`
--      subscribes to Supabase Realtime `postgres_changes` on `messages`,
--      and Realtime enforces RLS — a missing/wrong policy here silently
--      breaks live chat (members would need to manually refresh).
--
-- Everything else (user_profiles, notifications, rep_history, reviews,
-- posts, likes, comments, referrals, houses, house_memberships, events,
-- event_attendees, achievements, user_achievements, vault_items,
-- marketplace_items) gets deny-all. No browser-side Supabase client in
-- this codebase reads any of them today (confirmed by grepping for
-- `createClient`/`supabase` usage outside `RoomChat.tsx` and the
-- server-only session/middleware helpers) — if that ever changes, the
-- new client call needs its own reviewed policy added here first, not a
-- blanket relaxation.
--
-- NOT YET APPLIED as of this commit — this dev sandbox has no
-- `DATABASE_URL`/`DIRECT_URL` for the live Supabase project (no
-- `.env.local`), so this couldn't be run and verified end-to-end here.
-- Run via the Supabase SQL Editor (or `psql "$DIRECT_URL"`) against the
-- real project, then confirm `/rooms/[slug]` chat still receives live
-- messages before considering this done. See ADR-0017 and TECH_DEBT.md.

-- ============================================================
-- 1. users — self-select only
-- ============================================================
alter table public.users enable row level security;

create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- ============================================================
-- 2. rooms — authenticated can read all room metadata
-- ============================================================
alter table public.rooms enable row level security;

create policy "rooms_select_authenticated"
  on public.rooms
  for select
  to authenticated
  using (true);

-- ============================================================
-- 3. messages — authenticated can read messages in rooms they can
--    access, mirroring lib/rating/room-access.ts#canAccessRoom exactly:
--    user.level >= room.min_level, and if room.type = 'newcomers',
--    user.joined_at must be within the last 30 days.
-- ============================================================
alter table public.messages enable row level security;

create policy "messages_select_if_room_accessible"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rooms r
      join public.users u on u.id = auth.uid()
      where r.id = messages.room_id
        and u.level >= r.min_level
        and (
          r.type <> 'newcomers'
          or (u.joined_at is not null and u.joined_at >= now() - interval '30 days')
        )
    )
  );

-- ============================================================
-- 4. Everything else — deny-all (RLS on, no policies). The app's own
--    reads/writes go through Prisma (BYPASSRLS) and are unaffected.
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.rep_history enable row level security;
alter table public.reviews enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.referrals enable row level security;
alter table public.houses enable row level security;
alter table public.house_memberships enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.vault_items enable row level security;
alter table public.marketplace_items enable row level security;
