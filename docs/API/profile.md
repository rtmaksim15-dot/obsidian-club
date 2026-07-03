# `PATCH /api/profile`

Implementation: `app/api/profile/route.ts`. Called by
`components/shared/ProfileEditForm.tsx`
(`/profile/[id]/edit`).

Edits the **caller's own** profile only — the user id always comes from
the Supabase session (`getCurrentUser()`), never from the request body or
URL, so there is no way to edit someone else's profile by passing a
different id. The `/profile/[id]/edit` page's own `id === session user`
check is a UX redirect, not the security boundary; this route is.

## Request

```json
{
  "displayName": "string, required",
  "username": "string, required — /^[a-z0-9-]{3,30}$/",
  "bio": "string, optional"
}
```

## Responses

| Status | When | Body |
|---|---|---|
| `200` | Saved | `{ "ok": true }` |
| `400` | Body isn't valid JSON | `{ "error": "Invalid request." }` |
| `403` | Not authenticated | `{ "error": "Not authenticated." }` |
| `409` | Username already taken (unique constraint) | `{ "error": "That username is already taken." }` |
| `422` | Missing/invalid `displayName`/`username` | `{ "error": "..." }` |
| `503` | Database write failed for any other reason | `{ "error": "Could not save changes. Try again shortly." }` |

## Known gaps (see [TECH_DEBT.md](../../TECH_DEBT.md))

No profanity/reserved-word filtering on `username`. Avatar is updated
separately, via uploadthing's own `onUploadComplete` hook
(`app/api/uploadthing/core.ts`), not through this route.
