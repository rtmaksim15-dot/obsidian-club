# Posts: `/api/posts`

Implementation: `app/api/posts/route.ts` (list, create),
`app/api/posts/[id]/route.ts` (detail, edit, delete),
`app/api/posts/[id]/like/route.ts` (toggle like).

`ARCHITECTURE.md` §3 documents the `Post` model; the creation-rights
table below is from `PRODUCT.md` §10, enforced server-side by
`lib/rating/content-rights.ts#canCreatePostType()` — not just hidden in
`ContentComposer.tsx`'s type dropdown.

## `GET /api/posts`

The content feed: published posts with `minLevel <= caller.level`,
newest-first, paginated at 20. Optional `?type=` filters to one
`PostType` (`post`, `story`, `article`, `lecture`, `manifesto`,
`course`). Returns `{ posts: [{ id, title, content, mediaUrls, type,
minLevel, viewsCount, likesCount, createdAt, publishedAt, author: { id,
displayName, avatarUrl, level }, _count: { comments } }] }`.

Out-of-reach posts are **excluded entirely**, not shown locked — unlike
Rooms, no source doc describes a "locked post" teaser to build toward.

## `POST /api/posts`

Body: `{ "type": "post|story|article|lecture|manifesto|course",
"title": "string, optional", "content": "string, required, <=20000
chars", "minLevel": "1-6, optional, default 1" }`.

`403` if `canCreatePostType(caller, type)` fails — the exact
creation-rights table:

| Type | Minimum level to create |
|---|---|
| `post`, `story` | Level 1 (Initiate) |
| `article` | Warden (Level 4)+ |
| `lecture`, `course` | Master (Level 5)+ |
| `manifesto` | Admin only — no member level grants it |

Rejects content (or title) containing a URL (`http(s)://` or `www.`) —
`422` — per `CLAUDE.md`'s (2026-07-05) "no external links in posts"
rule.

Publishes immediately (`isPublished: true`, `publishedAt: now()`) — no
draft workflow is documented anywhere, so none was built. `201` with
`{ post: {...} }` on success. Grants the `first-post` achievement on a
member's first published post. **As of `v0.7`, publishing no longer
directly moves REP** — `CLAUDE.md`'s REP table only rewards posts via
"useful post" (needs an upvote/quality mechanism, not built) or "article
approved by editorial" (needs an editorial workflow, not built); see
[Architecture.md](../Architecture.md#rep-engine-actual-v07-replaces-the-v05v06-weighted-rating-engine)
and `TECH_DEBT.md`.

> Note: `/feed` and `/library` (the pages, `v0.7`) query Prisma directly
> server-side rather than calling this `GET` endpoint — same pattern as
> `/rooms` (see [rooms.md](rooms.md)). This route exists for any other
> client (mobile, future API consumers) and is what the composer's
> `POST` actually calls.

## `GET /api/posts/:id`

Single post, same shape as the feed plus `authorId`. `403` if
`minLevel` exceeds the caller's level, `404` if it doesn't exist.

## `PATCH /api/posts/:id`

Author-only. Body: `{ "title"?: "string", "content"?: "string" }`. Type,
`minLevel`, and publish state aren't editable after creation — no
documented workflow for changing them.

## `DELETE /api/posts/:id`

Author or admin. Hard-deletes (cascades to `Like`/`Comment` rows via the
schema's `onDelete: Cascade`) — no soft-delete/undo, `Post` has no
`isDeleted` column unlike `Message`/`Comment`.

## `POST /api/posts/:id/like`

Toggles the caller's like. `Like` is a real join table
(`postId`/`userId` composite key); `Post.likesCount` is a cached counter
kept in sync via a transaction on every toggle. Returns `{ liked:
true|false }`.

## Known gaps (see [TECH_DEBT.md](../../TECH_DEBT.md))

No comment API/UI — the `Comment` model exists in the schema (with
`isDeleted` for soft-delete) and posts return a live `_count.comments`,
but nothing can create or read a comment yet. No media upload for
`mediaUrls` (field exists, always empty). No pagination beyond "latest
20" on the feed. No rate limiting on posting.
