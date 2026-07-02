# ADR-0004: Extend the Waitlist schema beyond the documented minimal columns

**Status:** Accepted
**Date:** 2026-07-01

## Context

`ARCHITECTURE.md` §10 (Stage 1 minimal deploy) lists the waitlist table as
exactly `waitlist (id, email, name, referral_code, invited_by, created_at)`.
`DESIGN.md` §6 (Landing Page, Application section) specifies the actual
form fields as: Name, Email, Age, City, "How you heard of us", Invitation
code. `ARCHITECTURE.md` §9 (Security) separately calls out "age
verification при регистрации" as a requirement for this adult-content
platform.

## Problem

Three fields the documented application form collects — age, city, "how
you heard" — have no corresponding column in the documented minimal
table. Building the form exactly as DESIGN.md specifies while persisting
only the ARCHITECTURE.md-documented columns would mean silently discarding
submitted data, including age — a compliance-relevant field, not a
cosmetic one.

## Options considered

1. **Store only the documented minimal columns** — collect age/city/source
   in the form (per DESIGN.md) but drop them before the database write.
2. **Extend the table** with nullable `age`, `city`, `source` columns.

## Decision

Option 2. `prisma/schema.prisma`'s `Waitlist` model adds `age Int?`,
`city String?`, `source String?` alongside the documented columns.

## Why this option was chosen

Silently discarding a submitted 18+ age value is worse than a small,
additive, backward-compatible schema extension — especially given
ARCHITECTURE.md's own security section flags age verification as a real
requirement, not something to treat as disposable. The added columns are
all nullable, so nothing about the documented minimal shape is broken; a
system built strictly against the documented six columns would still work
unmodified.

## Trade-offs

- The as-built schema now diverges from the literal table definition in
  `ARCHITECTURE.md` §10 — documented here and cross-referenced in
  [Architecture.md](../Architecture.md) specifically so this is a visible,
  intentional divergence rather than silent drift.
- These fields' final shape/name may not survive contact with the real
  Stage 2 admin-review UI (e.g. "source" might become a structured enum
  instead of free text) — treated as provisional, not final.

## Future review conditions

- Revisit when Stage 2 (v0.2+) designs the actual application-review admin
  panel — confirm these fields still match what reviewers need to see, and
  formalize `source` if a fixed set of acquisition channels emerges from
  the content/growth strategy (`CONTENT_SYSTEM.md`).
