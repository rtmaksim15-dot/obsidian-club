-- Security audit fix (2026-09-23, see DECISIONS.md) — replaces
-- `messages_select_authenticated` (`auth.uid() IS NOT NULL`), which let
-- any signed-in member read every room's raw message rows directly via
-- Supabase Realtime/PostgREST, with no reference to room level or
-- active status at all. The app's own UI never actually exploited this
-- (RoomChat.tsx only uses Realtime as a "something changed" ping, then
-- re-fetches through GET /api/rooms/:slug/messages, which does enforce
-- canAccessRoom() properly) — but a direct Supabase client bypasses
-- that entirely, and this was dormant only because every room today
-- happens to have min_level = 1.
--
-- This enforces the same core gate canAccessRoom()
-- (lib/rating/room-access.ts) does — admin bypass, room must be
-- active, caller's level must meet the room's min_level — plus a
-- same-shape (deliberately slightly more conservative) version of the
-- newcomers room's 30-day window, using only what's actually in the
-- database. Two of canAccessRoom()'s niceties are intentionally NOT
-- replicated: the APP_OPEN-before-DOORS_OPEN_DATE "newcomers open to
-- everyone" soft-launch bypass (DOORS_OPEN_DATE is a runtime env var,
-- not a column) and the ritual-incomplete window extension (would mean
-- re-deriving isRitualComplete() in SQL — a second, drift-prone copy
-- of non-trivial logic). Omitting both only makes this MORE
-- restrictive than the app in those two narrow cases, never less — the
-- app's own route remains what actually serves content either way, so
-- a real member covered by one of those two exceptions still reads
-- their room normally through the app; they just wouldn't see it via a
-- raw direct-Realtime/PostgREST client during that specific window.
-- Never granting something the app itself would deny is the invariant
-- that matters.
--
-- Why a SECURITY DEFINER function instead of a plain join in the
-- policy: `public.users` has RLS enabled with zero SELECT policies of
-- its own (deny-all) — a policy on `messages` that joins `users`
-- directly would have that join itself subject to `users`' RLS for the
-- calling (authenticated) role, which returns nothing for anyone,
-- silently breaking the policy for every caller including one who
-- should be allowed in (caught live while verifying this fix — the
-- first version of this policy denied a legitimate level-3 test user
-- too). A SECURITY DEFINER function runs as its owner, bypassing RLS
-- for its own internal query, and returns only a boolean — it doesn't
-- open any new direct SELECT surface on `users` itself.
-- `set search_path = public` is required on a SECURITY DEFINER
-- function to prevent search-path hijacking.
create or replace function public.can_access_room(_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.rooms r
    join public.users u on u.id = auth.uid()
    where r.id = _room_id
      and r.is_active = true
      and (u.is_admin = true or u.level >= r.min_level)
      and (
        r.type <> 'newcomers'::"RoomType"
        or u.is_admin = true
        or (u.joined_at is not null and now() <= u.joined_at + interval '30 days')
      )
  );
$$;

drop policy if exists "messages_select_authenticated" on public.messages;

create policy "messages_select_room_access"
  on public.messages
  for select
  to public
  using (public.can_access_room(messages.room_id));
