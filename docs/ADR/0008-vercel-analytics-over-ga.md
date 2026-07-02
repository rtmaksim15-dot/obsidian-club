# ADR-0008: Vercel Analytics over Google Analytics

**Status:** Accepted
**Date:** 2026-07-02

## Context

`ROADMAP.md`'s Week 3 plan lists "Google Analytics / Vercel Analytics" as
an either/or line item. Google Analytics requires creating a GA4 property
in Max's Google account and retrieving a measurement ID before any code
can be wired in — the same category of external-account blocker as
Supabase, Resend, and the Vercel deploy itself (see
[DECISIONS.md](../../DECISIONS.md)).

## Problem

Need traffic analytics on the landing page without adding yet another
account-creation dependency that blocks progress until Max acts.

## Options considered

1. **Google Analytics** — richer product-analytics features (custom event
   funnels, cross-domain tracking), but blocked on Max creating a GA4
   property.
2. **Vercel Analytics** (`@vercel/analytics`) — zero-config, activates
   automatically once the app is deployed to Vercel, which Max already
   needs to set up for hosting regardless.

## Decision

Option 2. Installed `@vercel/analytics`, rendered via `<Analytics />` in
`app/layout.tsx`.

## Why this option was chosen

Satisfies `ROADMAP.md`'s explicit either/or without introducing a new
account-creation blocker — Vercel Analytics "comes free" the moment Max
completes the Vercel deploy he already has to do. Also decided as part of
this same change: gate `<Analytics />` behind `process.env.VERCEL`
(a variable Vercel sets automatically only on their own platform) — a real
Lighthouse best-practices audit caught the component's script 404ing with
a logged console error in any non-Vercel environment (local dev, this
sandbox); gating it makes local development clean while production
(the only place `VERCEL` is set) is unaffected.

## Trade-offs

- Vercel Analytics is materially less capable than GA4 — no custom event
  funnels, no cross-domain tracking, coarser reporting. Acceptable for the
  current need (page views/visitor counts on a single-page waitlist
  funnel), not acceptable if deeper funnel analysis becomes necessary.

## Future review conditions

- Revisit if the team needs section-level or event-level conversion
  analysis (e.g., "which section of the landing correlates with
  applications") — that likely requires GA4 or a dedicated
  product-analytics tool (e.g. PostHog), not something Vercel Analytics
  provides. At that point, creating the GA4 property becomes a genuine
  requirement rather than a nice-to-have, and should go back to Max as an
  explicit ask.
