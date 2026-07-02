# Admin: `/api/admin/applications`

Implementation: `app/api/admin/applications/route.ts` (list),
`app/api/admin/applications/[id]/route.ts` (approve/decline). Both require
`requireAdmin()` — **not** covered by `middleware.ts`'s route protection,
which only matches page paths starting with `/admin`, not `/api/admin/*`
(see [API/README.md](README.md#auth-v02)). Every handler here must call
`requireAdmin()` itself.

## `GET /api/admin/applications?status=pending|approved|declined`

Defaults to `status=pending`. Returns
`{ "applications": Waitlist[] }` ordered oldest-first (review queue
order). `403` if the caller isn't an admin.

## `PATCH /api/admin/applications/:id`

Body: `{ "action": "approve" | "decline" }`.

| Status | When |
|---|---|
| `200` | `{ "ok": true, "status": "declined" }` |
| `200` | `{ "ok": true, "status": "approved", "userId": "..." }` |
| `403` | Not an admin |
| `404` | No application with that id |
| `409` | Already reviewed (`{ "error": "Already approved." }` etc.) |
| `422` | `action` missing/invalid |
| `503` | Supabase Auth user creation failed, **or** it succeeded but the matching `users` row write failed — see below |

### On decline

Sets `status: declined`, `reviewedAt`, `reviewedBy`. **No email is
sent** — `PRODUCT.md` §1 specifies declines carry no explanation, by
design, not oversight.

### On approve

1. Creates a Supabase Auth user via `auth.admin.generateLink({ type:
   "invite", email })` — generates an invite link **without** sending
   Supabase's own default invite email.
2. In a single Prisma transaction: creates the matching `users` row
   (same `id` as the Supabase Auth user — see
   [ADR-0010](../ADR/0010-supabase-auth.md)'s UUID-sync note) at Level I /
   `active`, and marks the `Waitlist` row `approved`.
3. Sends this app's own branded "your access has been granted" email
   (`lib/utils/email.ts#sendAccessGrantedEmail`) containing the invite
   link, via Resend.

**Known gap:** steps 1 and 2 aren't a single atomic transaction (one is
an external API call, the other is Postgres) — if step 1 succeeds but
step 2 fails, there's an orphaned Supabase Auth user with no matching
`users` row. Logged loudly (`console.error`) for manual reconciliation.
See [TECH_DEBT.md](../../TECH_DEBT.md).

**Simplification from `PRODUCT.md`'s full spec:** approval grants Level I
and `active` status immediately — the full Initiation Ritual gating
(`PRODUCT.md` §1 Stage 2) isn't built yet. See
[TECH_DEBT.md](../../TECH_DEBT.md).
