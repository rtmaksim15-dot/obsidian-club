# Rooms: `/api/rooms`

Implementation: `app/api/rooms/route.ts` (list),
`app/api/rooms/[slug]/route.ts` (detail),
`app/api/rooms/[slug]/messages/route.ts` (history + post),
`app/api/admin/rooms/route.ts` (admin create).

`ARCHITECTURE.md` §4 documents these as `/api/rooms/:id` — this app uses
the room's `slug` in the URL instead of its UUID (nicer, stable URLs);
otherwise the shape matches.

## `GET /api/rooms`

All active rooms, **including locked ones** — DESIGN.md: "Заблокированные
комнаты видны, но с замком" (locked rooms are visible, just marked with
a lock). Returns `{ rooms: [{ id, slug, name, description, type,
minLevel, city, locked }] }`. `locked` is computed server-side via
`lib/rating/room-access.ts#canAccessRoom()` — never trust a client-side
level check.

## `GET /api/rooms/:slug`

Single room, same shape as above, `{ room: {...} }`. `404` if it doesn't
exist or `isActive: false`.

## `GET /api/rooms/:slug/messages`

Latest 50 messages, oldest-first (matches the chat UI's reading
direction). Each message includes its author's `id`, `displayName`,
`avatarUrl`, `level` (avoids an N+1 query client-side). `403` if the
room is locked for the caller — same access check as above, enforced
here too (not just hidden in the UI).

## `POST /api/rooms/:slug/messages`

Body: `{ "content": "string, required, <=2000 chars", "replyToId":
"string, optional" }`. Same `403` locked-room check. `201` with
`{ message: {...} }` on success.

## `POST /api/admin/rooms`

Admin-only. Body: `{ name, slug, description?, type, minLevel?, city?,
country? }`. `type` must be one of `RoomType`'s values. Exists so admins
can create thematic rooms with real topics — none are pre-seeded, see
[DECISIONS.md](../../DECISIONS.md) (2026-07-03) and
[prisma/seed.ts](../../prisma/seed.ts).

## Known gaps (see [TECH_DEBT.md](../../TECH_DEBT.md))

No pagination beyond "latest 50" on message history; no real-time
delivery guarantee testing (requires a real Supabase project with
Realtime enabled on the `messages` table); no message editing/deletion
endpoints yet; no rate limiting on posting.
