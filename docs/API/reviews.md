# `POST /api/users/:id/review`

Implementation: `app/api/users/[id]/review/route.ts`. Called by
`components/shared/ReviewForm.tsx` (`/profile/[id]`).

## Request

```json
{
  "rating": "integer 1-5, required",
  "comment": "string, optional",
  "context": "string, optional — not yet surfaced in the UI; the schema supports it for when Events (v0.7) give reviews a real context"
}
```

## Responses

| Status | When | Body |
|---|---|---|
| `201` | Review recorded | `{ "ok": true }` |
| `400` | Body isn't valid JSON | `{ "error": "Invalid request." }` |
| `403` | Not authenticated | `{ "error": "Not authenticated." }` |
| `404` | `:id` doesn't exist | `{ "error": "Member not found." }` |
| `422` | Reviewing yourself, or `rating` isn't an integer 1-5 | `{ "error": "..." }` |

## Side effects

1. Creates a `Review` row.
2. Recomputes the reviewed member's `reputation` as the average of all
   their visible reviews (`isVisible: true`) — `PRODUCT.md` doesn't
   specify an exact formula beyond "1-5 stars, depends on conduct..."; a
   plain average is this session's documented default, not a literal
   spec requirement.
3. Calls `lib/rating/rating-engine.ts#recalculateRating()`, which
   recomputes the member's overall `rating` per `ARCHITECTURE.md` §5's
   weighted formula and logs the delta to `RatingHistory`.

## Known gaps (see [TECH_DEBT.md](../../TECH_DEBT.md))

No restriction on submitting multiple reviews for the same member (by
design — `PRODUCT.md`'s `context` field implies reviews can recur, e.g.
once per event); no reporting/moderation of abusive reviews yet
(`isVisible` exists for hiding one, nothing sets it to `false`).
