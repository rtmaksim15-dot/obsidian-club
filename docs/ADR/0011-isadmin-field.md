# ADR-0011: Add `isAdmin` to the `User` model

**Status:** Accepted
**Date:** 2026-07-02

## Context

`ARCHITECTURE.md` §4 documents `GET/PATCH /api/admin/*` endpoints but its
§3 `User` table has no field distinguishing an admin from a regular
member — there's no documented mechanism at all for who's allowed to call
those endpoints.

## Problem

Building the admin approval API (`v0.2`) requires *some* way to check
"is this caller an admin," and nothing in the source docs specifies one.

## Options considered

1. **Env-var allowlist** (e.g. `ADMIN_EMAILS=max@...`) — no schema
   change, but doesn't scale past a couple of hardcoded people and can't
   be managed without a redeploy.
2. **`isAdmin Boolean` on `User`** — a real, queryable, manageable field.
3. **A separate `Role`/`Permission` model** — most flexible, but pure
   speculative complexity for a single admin/not-admin distinction that
   doesn't exist yet in any source doc.

## Decision

Option 2. Added `isAdmin Boolean @default(false)` to `User`.

## Why this option was chosen

The simplest thing that actually solves the stated problem. An env-var
allowlist would work for exactly one admin (Max) but breaks down the
moment a second reviewer is needed and requires a deploy to change — a
real cost given `ARCHITECTURE.md`'s own admin API already anticipates an
ongoing review workflow, not a one-person, one-time task. A full
role/permission system is solving a problem that doesn't exist in any
documented product requirement yet — `PRODUCT.md`'s member levels
(Mentor/Master/Council) are a *separate* concept from platform
administration and shouldn't be conflated with it preemptively.

## Trade-offs

- Binary admin/not-admin only — no distinction between, say, "can review
  applications" and "can manage billing," if that's ever needed.
- No admin UI to grant/revoke `isAdmin` yet — must be set directly in the
  database until one exists. Acceptable for the current single-admin
  (Max) reality.

## Future review conditions

- Revisit if more than one or two people ever need admin access with
  *different* scopes of what they can do — that's the trigger for a real
  role/permission model, not before.
