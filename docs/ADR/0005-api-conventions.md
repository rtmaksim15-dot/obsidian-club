# ADR-0005: API response/error conventions

**Status:** Accepted
**Date:** 2026-07-01

## Context

`ARCHITECTURE.md` §4 lists API endpoint paths and HTTP verbs (e.g.
`POST /api/auth/apply`, `GET /api/users/:id`) but doesn't specify a
response envelope, error format, or status-code conventions. The first
real endpoint (`POST /api/waitlist`) had to make these calls with no
documented precedent to follow.

## Problem

Without an explicit, written convention, each future endpoint is likely to
invent its own error shape, leading to inconsistent client-side error
handling across the app as more endpoints are added.

## Options considered

1. **Ad hoc per endpoint** — decide response shape case-by-case as each
   endpoint is built.
2. **Establish and document a fixed convention now**, based on the pattern
   already implemented for `/api/waitlist`, before a second endpoint can
   diverge from it.

## Decision

Option 2 — documented in [docs/API/README.md](../API/README.md):
Next.js Route Handlers, JSON in/out, `{ error: string }` on any failure,
specific status-code meanings (`400` malformed body, `422` validation
failure, `503` downstream-dependency failure, `201` created), no leaking
internal error details to the client, non-critical side effects (e.g.
email sending) must never fail the primary request, and duplicate/existing
resources are treated idempotently rather than exposed as errors (avoids
enumeration leaks — see `/api/waitlist`'s duplicate-email handling).

## Why this option was chosen

Cheap to standardize now, while there's exactly one endpoint to reconcile
against the convention. Expensive to retrofit consistently once five or
ten endpoints exist with their own ad hoc shapes — and inconsistent error
handling is the kind of defect that's invisible until a client
(the eventual mobile apps, per `ROADMAP.md` Stage 3/4) has to handle N
different error shapes.

## Trade-offs

- Slightly more upfront ceremony per endpoint (must actively conform to
  the convention rather than doing whatever's fastest).
- The convention was derived from a single real example
  (`/api/waitlist`) — it may need adjustment once auth-protected endpoints
  exist and a 401/403 convention is needed (not yet covered).

## Future review conditions

- Revisit once authentication exists (v0.2) — add explicit 401/403
  conventions and decide whether auth errors follow the same
  `{ error: string }` shape or need additional structure (e.g. an error
  `code` field for client-side branching).
- Revisit once a second real endpoint is built — confirm the convention
  held up in practice, not just in theory.
