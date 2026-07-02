# `POST /api/waitlist`

Implementation: `app/api/waitlist/route.ts`. Called by
`components/shared/WaitlistForm.tsx` (Landing Page, Application section).

## Request

```json
{
  "name": "string, required",
  "email": "string, required, valid email format",
  "age": "string (numeric), required, >= 18",
  "city": "string, optional",
  "source": "string, optional — how they heard about the club",
  "referralCode": "string, optional"
}
```

## Responses

| Status | When | Body |
|---|---|---|
| `201` | Application accepted — new record created, **or** the email already existed (see below) | `{ "ok": true }` |
| `400` | Body isn't valid JSON | `{ "error": "Invalid request." }` |
| `422` | `name` missing | `{ "error": "Name is required." }` |
| `422` | `email` missing/malformed | `{ "error": "A valid email is required." }` |
| `422` | `age` missing or < 18 | `{ "error": "You must be 18 or older." }` |
| `503` | Database write failed for any other reason | `{ "error": "The club could not be reached. Try again shortly." }` |

## Side effects

1. Writes a row to the `Waitlist` table (`prisma.waitlist.create`) — see
   [Architecture.md](../Architecture.md) and
   [ADR-0004](../ADR/0004-extend-waitlist-schema.md) for the schema.
2. Sends a confirmation email via Resend
   (`lib/utils/email.ts#sendWaitlistConfirmation`) — **best-effort**: if
   `RESEND_API_KEY` isn't configured, or the send fails, this is logged and
   swallowed; it never causes the request to fail.

## Duplicate emails

`email` is unique on the `Waitlist` table. A resubmission with an existing
email hits Prisma's `P2002` constraint error, which this route catches and
treats as **success** (`201`, same body) rather than an error — this
avoids confirming to a caller "yes, this email is already in our system"
(email enumeration). See [ADR-0005](../ADR/0005-api-conventions.md).

## Current limitations (tracked in [TECH_DEBT.md](../../TECH_DEBT.md))

- No rate limiting yet.
- `DATABASE_URL`/`RESEND_API_KEY` aren't populated with real values yet —
  in the current environment every request returns `503`. This is
  intentional/expected until Max provisions Supabase and Resend.
