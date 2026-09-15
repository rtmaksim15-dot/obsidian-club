-- Direct Messages (2026-09-14, see DECISIONS.md): RLS for the four new
-- tables backing conversation requests, threads, and thread messages.
--
-- Deny-all (RLS enabled, zero policies) is correct for three of the
-- four: nothing in this codebase queries conversation_requests,
-- threads, or thread_participants via the browser-side (anon/
-- authenticated) Supabase client — every read and write goes through
-- Prisma, server-side, in the DM API routes.
--
-- `direct_messages` needs a real SELECT policy, for the same reason
-- `messages` (Room chat) does: RoomChat.tsx's Realtime subscription
-- enforces RLS on delivery (it only sends a change event if the
-- subscribing role could SELECT that row), so a deny-all policy would
-- silently break live message delivery in a thread. Confirmed
-- 2026-08-04 (see that migration, messages_select_authenticated) that
-- Realtime's postgres_changes authorization does not evaluate a policy
-- that joins to another table, even when the identical predicate is
-- true as a direct SQL query — so the real per-thread access check
-- (is this caller a participant who hasn't left?) cannot live in this
-- policy at all. It lives entirely server-side instead: every DM API
-- route (GET/POST on a thread's messages, accept/decline, leave) checks
-- ThreadParticipant with leftAt null before returning or accepting
-- anything. This policy only controls whether the live "something
-- changed" ping fires — never what content a member actually sees.
--
-- Copying `messages`' own `auth.uid() is not null` here verbatim would
-- be a real information leak specific to this table: Room content is
-- shared among a level of members anyway, but a DM thread is private to
-- two specific people, and `auth.uid() is not null` would let ANY
-- authenticated member subscribe to ANY thread's live content directly
-- via Realtime, bypassing the server-side check entirely (Realtime
-- authorizes against RLS directly, never through this app's API). So
-- `direct_messages.participant_a_id`/`participant_b_id` are a
-- deliberate denormalization (copied from `threads` at message-creation
-- time, see that model's schema comment) purely so this policy can stay
-- join-free while still being scoped to the two actual participants,
-- not everyone:
--
--   auth.uid() = participant_a_id or auth.uid() = participant_b_id
--
-- This does not reproduce the "has this participant left" check (also a
-- join, also would break Realtime) — a participant who left can still
-- receive a live ping for a thread's new messages via this policy alone.
-- That's fine: the ping carries no content on its own to a client that
-- isn't already rendering that thread, and GET /api/dm/threads/:id/messages
-- (what any real client calls on a ping) enforces the full, current
-- ThreadParticipant/leftAt check server-side before returning content.

alter table conversation_requests enable row level security;
alter table threads               enable row level security;
alter table thread_participants   enable row level security;
alter table direct_messages       enable row level security;

create policy direct_messages_select_participants on direct_messages
  for select using (auth.uid() = participant_a_id or auth.uid() = participant_b_id);
