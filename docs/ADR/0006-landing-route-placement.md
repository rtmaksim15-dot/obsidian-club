# ADR-0006: Landing page lives at `app/(landing)/page.tsx`, not `app/page.tsx`

**Status:** Accepted
**Date:** 2026-07-01

## Context

`ARCHITECTURE.md` §7's folder structure explicitly places the landing page
at `app/(landing)/page.tsx`, using a Next.js route group to keep the
public landing separate from `(auth)` and `(platform)` route groups.
`create-next-app`'s default scaffold instead generates `app/page.tsx`
directly at the root.

## Problem

Both files resolve to the same URL (`/`) — Next.js doesn't allow two route
handlers/pages for the same path, so one had to be removed.

## Options considered

1. **Keep the scaffold default** (`app/page.tsx`), ignore
   `ARCHITECTURE.md`'s route-group structure for convenience.
2. **Follow `ARCHITECTURE.md` exactly** — delete `app/page.tsx`, build the
   landing at `app/(landing)/page.tsx`.

## Decision

Option 2.

## Why this option was chosen

`ARCHITECTURE.md`'s folder plan is a deliberate structural decision (route
groups organize `(auth)`, `(platform)`, and `(landing)` as clearly distinct
concerns as the app grows into Stage 2+) — not an accident of how
`create-next-app` happens to scaffold a new project. Deviating on day one
for scaffold-default convenience would be exactly the kind of silent drift
this documentation framework exists to prevent, for zero actual benefit —
the URL is identical either way.

## Trade-offs

None identified — route groups are purely organizational in Next.js App
Router and have no effect on the resulting URL or bundle.

## Future review conditions

None anticipated under normal circumstances. Revisit only if a future
Next.js version changes route-group semantics in a way that makes this
structure costly to maintain.
