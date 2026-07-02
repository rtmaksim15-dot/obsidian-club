# API Conventions

> Formal rationale: [ADR-0005](../ADR/0005-api-conventions.md). This page
> is the practical checklist; the ADR is the "why."

One file per resource in this directory (e.g. `waitlist.md`). As new
endpoints are added, document them here — a route without a doc page here
is incomplete, not "documented later."

## Transport

- Next.js App Router **Route Handlers** (`app/api/<resource>/route.ts`),
  not a separate Express/Fastify server, for as long as the app stays on
  Vercel + Next (see `ARCHITECTURE.md` — Next API Routes now, dedicated
  Node/Express only if genuinely needed at scale).
- Request/response bodies are JSON. No form-encoded bodies, no XML.

## Response shape

- **Success:** `NextResponse.json(<payload>, { status: <2xx> })`. Keep the
  success payload minimal — `{ ok: true }` is enough when the client
  doesn't need data back (see `waitlist.md`).
- **Failure:** always `{ error: string }` with an appropriate 4xx/5xx
  status. Never leak stack traces, internal error messages, or driver-level
  details (Prisma error text, etc.) to the client — log those
  server-side (`console.error`) and return a short, honest, user-facing
  message instead.

## Status codes actually in use

| Code | Meaning here |
|---|---|
| `201` | Created (a new record was accepted) |
| `400` | Malformed request body (not valid JSON) |
| `422` | Well-formed but invalid input (failed validation) |
| `503` | A downstream dependency (database, etc.) is unavailable — **not** the caller's fault, distinguish this from `422`/`400` |

## Validation

Validate server-side, always — never trust that client-side validation
(e.g. the `<input required>` / age check in `WaitlistForm.tsx`) actually
ran. The route re-validates everything it's given.

## Privacy-preserving idempotency

Where a resource is keyed by something a client controls (e.g. email),
prefer treating a duplicate submission as success rather than exposing
"this already exists" — that's an email-enumeration leak. See
`waitlist.md` for the concrete pattern.

## Non-critical side effects must not fail the request

If an endpoint's main job succeeds (e.g. the DB write) but a secondary
side effect fails (e.g. sending a confirmation email), the request should
still succeed. Side effects like this should be written so they can never
throw past the caller — catch and log internally
(see `lib/utils/email.ts`).

## Auth (once it exists, v0.2+)

Not yet implemented. When it lands, this section must be updated *before*
any endpoint relies on it — don't let an endpoint's real auth behavior
diverge from what's written here.
