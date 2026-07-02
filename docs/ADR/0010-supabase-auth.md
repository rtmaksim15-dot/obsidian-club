# ADR-0010: Supabase Auth for authentication

**Status:** Accepted
**Date:** 2026-07-02

## Context

`ARCHITECTURE.md` names two conflicting things for authentication: under
**Backend**, "Auth: NextAuth.js v5 (или Clerk для быстрого старта)"; under
**Инфраструктура**, "DB Hosting: Supabase (PostgreSQL + **Auth** +
Realtime + Storage)" — implying Supabase's own built-in Auth service as a
third, unstated option. `BACKLOG.md`'s `v0.2` scope flagged this as an
open decision requiring Max's confirmation before any auth code is
written, rather than picking one silently.

## Problem

Three viable, materially different options exist across the source docs,
and picking wrong means rebuilding all of `v0.2`'s auth-dependent work
(login, session handling, the admin approval flow, route protection).

## Options considered

1. **NextAuth v5 (Auth.js)** — fully self-hosted, no external account,
   maximum control over the `User` schema, but all security-critical work
   (password hashing, email verification, session security) is our
   responsibility to get right.
2. **Clerk** — fastest to implement, managed, drop-in UI components, but
   requires Max to create yet another external account — the same
   blocker pattern already open for Vercel, Supabase, and Resend.
3. **Supabase Auth** — managed, but lives inside the *same* Supabase
   project the app already needs to provision for its Postgres database
   (per `ARCHITECTURE.md`) — no new vendor account. Integrates naturally
   with Row Level Security, which `ARCHITECTURE.md` §9 already requires.

## Decision

Option 3, Supabase Auth. Presented to Max as an explicit choice; **Max
chose Supabase Auth.**

## Why this option was chosen

It resolves the doc ambiguity in favor of the reading that adds the least
new surface area: the app already requires a Supabase project for
PostgreSQL hosting (`ARCHITECTURE.md`), so Supabase Auth doesn't add a
new account-creation blocker the way Clerk would, and it doesn't put
security-critical primitives (password hashing, session tokens) on this
project's own shoulders the way a from-scratch NextAuth Credentials setup
would. It also pairs directly with the already-required Row Level
Security work, since Supabase Auth's `auth.uid()` is the natural RLS
predicate.

## Trade-offs

- `auth.users` (Supabase-managed) and `public.users` (this app's Prisma
  `User` model) are two separate tables that must be kept in sync by
  UUID — on account creation, a `public.users` row must be created with
  the same `id` as the corresponding `auth.users` row. This is a standard,
  well-documented Supabase+Prisma pattern, but it is an extra integration
  point vs. a single-table NextAuth setup.
- Less flexible than NextAuth if the product ever needs an auth provider
  Supabase doesn't support well.
- Requires `@supabase/ssr` (not just `@supabase/supabase-js`, already
  installed) for correct session handling in Next.js App Router — a new
  dependency.
- Cannot be verified end-to-end until Max provisions the real Supabase
  project (same blocker already tracked in `TECH_DEBT.md` for the
  database itself) — auth code will be built and defensively coded
  against missing credentials, same pattern as the `v0.1` Resend
  integration, but real login cannot be tested until then.

## Future review conditions

- Revisit if Supabase Auth proves insufficient for a specific need (e.g.
  a social-login provider it doesn't support well, or if the
  approval-gated invite flow — this platform doesn't have open signup —
  turns out to fight Supabase Auth's assumptions more than expected).
