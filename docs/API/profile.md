# `PATCH /api/profile`

Implementation: `app/api/profile/route.ts`. Called by
`components/shared/ProfileEditForm.tsx` (`/profile/edit`).

Edits the **caller's own** profile only — the user id always comes from
the Supabase session (`getCurrentUser()`), never from the request body or
URL, so there is no way to edit someone else's profile by passing a
different id. `/profile/edit` takes no id/username param at all — it is
always the caller's own profile — so there's no separate UX-level check
to redirect on; this route is the entire security boundary.

## Request

```json
{
  "displayName": "string, required",
  "username": "string, required — /^[a-z0-9-]{3,30}$/",
  "bio": "string, optional — 300 characters max"
}
```

## Responses

| Status | When | Body |
|---|---|---|
| `200` | Saved | `{ "ok": true }` |
| `400` | Body isn't valid JSON | `{ "error": "Invalid request." }` |
| `403` | Not authenticated | `{ "error": "Not authenticated." }` |
| `409` | Username already taken (unique constraint) | `{ "error": "That username is already taken." }` |
| `422` | Missing/invalid `displayName`/`username`, or `bio` over 300 chars | `{ "error": "..." }` |
| `503` | Database write failed for any other reason | `{ "error": "Could not save changes. Try again shortly." }` |

## Known gaps (see [TECH_DEBT.md](../../TECH_DEBT.md))

No profanity/reserved-word filtering on `username`.

---

# `POST /api/profile/avatar`

Implementation: `app/api/profile/avatar/route.ts`. Called by
`components/shared/AvatarUploadButton.tsx` (rendered on `/profile/edit`).

Uploads the **caller's own** avatar to Supabase Storage (`avatars`
bucket, lazily created — same pattern as `POST /api/posts/photo`), then
writes the resulting public URL to `User.avatarUrl` directly. Replaces
the old UploadThing-based flow (2026-07-20) — see DECISIONS.md.

Request: `multipart/form-data` with a single `file` field. JPEG/PNG/WEBP/
GIF only, 8MB max. Stored at a fixed `<userId>/avatar.<ext>` path with
`upsert: true`, so re-uploading replaces the previous file rather than
accumulating orphaned objects; the returned URL has a `?v=<timestamp>`
cache-buster since the path itself never changes.

## Responses

| Status | When | Body |
|---|---|---|
| `201` | Uploaded and saved | `{ "avatarUrl": "https://…" }` |
| `403` | Not authenticated | `{ "error": "Not authenticated." }` |
| `422` | No file / wrong type / over 8MB | `{ "error": "..." }` |
| `503` | Storage upload failed | `{ "error": "Could not upload avatar. Try again shortly." }` |
