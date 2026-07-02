# ADR-0007: Make the landing page indexable (`robots: index, follow`)

**Status:** Accepted
**Date:** 2026-07-02

## Context

The Week 1 build set `robots: { index: false, follow: false }` in
`app/layout.tsx` as a defensive "private by default until launch" default,
without a specific reason beyond general caution for a not-yet-public
project. `ROADMAP.md`'s Week 3 goal is explicitly titled "Полировка
Landing + SEO" (Landing polish + SEO), and `CONTENT_SYSTEM.md` describes a
6-month, multi-platform audience warm-up whose entire purpose is to drive
traffic to this landing page to grow the waitlist.

## Problem

A `noindex` directive directly contradicts the stated purpose of the page
it's on. It also fails Lighthouse's SEO audit outright ("Page is blocked
from indexing"), which conflicts with the same week's other explicit goal
("Lighthouse score 90+").

## Options considered

1. **Keep `noindex`** — preserve the original defensive posture.
2. **Flip to indexable** (`index: true, follow: true`), scoped to the
   public Landing route only.

## Decision

Option 2.

## Why this option was chosen

The landing page's stated job (per `ROADMAP.md` and `CONTENT_SYSTEM.md`)
is to be found via search and social, and convert that traffic into
waitlist applications. `noindex` was an unreflective default carried over
from Week 1, before Week 3's actual SEO goal was defined — once that goal
existed, keeping `noindex` would have been actively working against it,
not "playing it safe."

## Trade-offs

- The landing's content (level names, club philosophy copy, the existence
  of the club at all) becomes publicly crawlable and searchable before the
  platform itself launches. Assessed as acceptable: none of this content
  is sensitive, and it is exactly the top-of-funnel content
  `CONTENT_SYSTEM.md` already intends to be public via social channels.
- This decision is scoped **only** to the public Landing route. The
  future authenticated Platform routes (`app/(platform)/*`) must be gated
  by actual auth middleware once they exist (v0.2+), not by robots
  meta — robots directives are not an access-control mechanism.

## Future review conditions

- Revisit if Max wants a stealth/invite-only pre-launch phase instead of
  the open-funnel strategy `CONTENT_SYSTEM.md` currently describes — that
  would be a product-strategy decision made by Max, not something to flip
  back unilaterally based on a technical audit.
