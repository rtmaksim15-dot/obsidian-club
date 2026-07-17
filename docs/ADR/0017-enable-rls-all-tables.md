# ADR-0017: Enable Row Level Security on every table, deny-all by default

**Status:** Accepted — migration drafted, **not yet applied** (see Trade-offs)
**Date:** 2026-07-17

## Context

`DECISIONS.md` (2026-07-16, during the admin-panel-review task) found
that RLS is enabled on exactly one `public` table — `waitlist` (fixed
2026-07-14) — out of twenty. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by
design (it ships to every browser), and Supabase's PostgREST layer
exposes every `public` table through it unless RLS blocks the read.
Concretely, anyone with devtools open could call
`GET https://<project>.supabase.co/rest/v1/users?select=*` with the anon
key and read every member's email, age, city, REP — or read `messages`
from rooms this app gates behind level/rank — entirely bypassing
`requireAdmin()`, `getCurrentUser()`, and `middleware.ts`, since every
real code path in this app reads through Prisma via `DATABASE_URL`
(`BYPASSRLS` role) and has never once touched this gap.

`TECH_DEBT.md` flagged this as urgent but deliberately unfixed pending "a
dedicated pass" — a blanket `ENABLE ROW LEVEL SECURITY` with no policies
is almost free (nothing here uses a browser-side Supabase client for
data reads) except one real exception: `components/shared/RoomChat.tsx`
subscribes to Supabase Realtime `postgres_changes` on `messages`, and
Realtime enforces RLS itself — a missing/wrong `SELECT` policy there
would silently stop live chat, not just theoretically.

## Problem

How do we close the anon-key/PostgREST exposure on the remaining
nineteen tables without breaking `RoomChat.tsx`'s Realtime subscription?

## Options considered

1. **Deny-all on every table, no exceptions.** Simplest, but breaks
   Realtime message delivery — Realtime's RLS check has no BYPASSRLS
   equivalent for the subscribing client.
2. **Deny-all everywhere except `messages`, with `messages` open to any
   authenticated user regardless of room access.** Fixes Realtime but
   reopens exactly the gated-room content leak this is meant to close —
   a Level I member could still read Council-room messages via the REST
   API even if the UI never shows them the room.
3. **Deny-all by default; narrow, reviewed allow-policies only where the
   app has a real browser-side Supabase client read today** — `users`
   (self-row only, needed as a join target), `rooms` (all rows —
   metadata isn't sensitive), and `messages` (gated by the same
   level/newcomers-window logic `lib/rating/room-access.ts#canAccessRoom`
   already enforces server-side).

## Decision

Option 3. `supabase/migrations/0001_enable_rls.sql` enables RLS on all
sixteen still-unprotected tables (the fourteen `TECH_DEBT.md` named, plus
`house_memberships`, `comments`, `events`, `event_attendees`, and
`achievements` — added to the schema since that check ran, and just as
unprotected by default). Three tables get an allow-policy; the other
thirteen get RLS-on-with-no-policy (deny-all for `anon`/`authenticated`;
Prisma's role is unaffected since it has `BYPASSRLS`).

The `messages` policy re-implements `canAccessRoom()`'s exact rule in
SQL (`user.level >= room.min_level`, plus the 30-day `newcomers`-room
window) rather than a looser approximation, so REST/Realtime access
matches the UI's access exactly — no member can read a room's messages
through the API that they couldn't already open in the app.

## Why this option was chosen

It's the only option that closes the actual PII/private-content leak
(unlike Option 2) without a known functional regression (unlike Option
1). The cost is that any *future* browser-side Supabase read against a
table not in this policy set needs its own reviewed policy added first —
treated as a feature, not a gap, per `TECH_DEBT.md`'s framing: this
should be a deliberate reviewed step, not something that silently starts
working or silently stays broken.

## Trade-offs

- **Not yet applied.** This dev sandbox has no `DATABASE_URL`/
  `DIRECT_URL` for the live Supabase project (no `.env.local` present —
  unlike the sandbox that did the 2026-07-05 `db push`/seed work), so
  the migration could be written and reasoned about here but not run or
  verified end-to-end. It needs to be run (Supabase SQL Editor, or
  `psql "$DIRECT_URL" -f supabase/migrations/0001_enable_rls.sql`) by
  whoever next has real project credentials, then verified by opening
  `/rooms/[slug]` in two sessions and confirming a message posted in one
  still appears live in the other without a manual refresh.
- `rooms` is fully readable by any authenticated user, including rooms
  they can't post in (level-gated) — accepted because room *metadata*
  (name, type, min_level) isn't sensitive; only message *content* is
  access-controlled here.
- No `INSERT`/`UPDATE`/`DELETE` policies were added anywhere (including
  `users`/`rooms`/`messages`) — nothing in this codebase writes through
  the browser Supabase client today, so there's no policy to design yet;
  add one if that ever changes, don't assume `SELECT`-only is permanent.
- This migration lives outside Prisma's `db push` flow (Prisma has no
  first-class RLS/policy management) — it's a plain SQL file, run
  separately, and will need to be re-applied (or moved into a proper
  Supabase-CLI-managed migration chain) if the schema is ever rebuilt
  from scratch on a fresh project.

## Future review conditions

- Before any new code adds a browser-side `supabase.from(...)` data read
  (not just Auth), check this migration first and add a matching policy
  — don't ship the read against a denied table and discover it silently
  returns empty.
- Revisit `rooms`' all-authenticated-read policy if room metadata ever
  becomes sensitive (e.g., private/invite-only rooms with names that
  shouldn't leak).
- Once this is actually applied to the live project, update
  `TECH_DEBT.md`'s entry to "resolved" with the verification date — not
  before.
