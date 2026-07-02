# ADR-0012: Add status tracking to the `Waitlist` model

**Status:** Accepted
**Date:** 2026-07-02

## Context

`PRODUCT.md` §1 explicitly documents three application statuses —
"Pending — на рассмотрении, Approved — одобрена, Declined — отклонена" —
as part of the core application flow. `ARCHITECTURE.md` §10's minimal
Stage-1 waitlist table (`id, email, name, referral_code, invited_by,
created_at`) has no status column at all — the same category of gap
already found once for `age`/`city`/`source`
([ADR-0004](0004-extend-waitlist-schema.md)).

## Problem

Building the admin approval API (`v0.2`) requires tracking which
applications have been reviewed and how — without a status field, there's
no way to distinguish a reviewed application from an unreviewed one, or
to record a decline (which, per `PRODUCT.md`, must persist with no
explanation shown to the applicant, but still needs to be recorded
internally so it isn't reviewed twice).

## Options considered

1. **No status field** — infer "processed" some other way (e.g., check
   whether a matching `User` row exists). Fails for declines, which
   never create a `User` row — there'd be no record a decline ever
   happened.
2. **Add `status` (enum: pending/approved/declined) + a minimal review
   audit trail** (`reviewedAt`, `reviewedBy`) to `Waitlist`.

## Decision

Option 2.

## Why this option was chosen

`PRODUCT.md` already specifies these exact three states by name — this
isn't inventing new product logic, it's filling in a schema gap for
mechanics the product doc already committed to. The audit trail
(`reviewedAt`/`reviewedBy`) is a small, standard addition for any
admin-facing review action, and fits the platform's own stated ethos
(invitations/approvals are acts of responsibility, per
[Philosophy.md](../Philosophy.md)) — knowing who approved whom is
operationally relevant, not just a nice-to-have.

## Trade-offs

- Same category of drift from `ARCHITECTURE.md`'s literal table
  definition as ADR-0004 — documented here and in
  [Architecture.md](../Architecture.md), not silent.
- `reviewedBy` stores a raw UUID with no enforced foreign-key relation to
  `User` (declined admins/reviewers who are later deleted would leave a
  dangling reference) — acceptable at current scale (one admin), revisit
  if that becomes a real integrity concern.

## Future review conditions

- Revisit if the review flow needs more granularity than three states
  (e.g., "under further review," "waitlisted for capacity" as distinct
  from "pending") — not currently justified by any source doc.
