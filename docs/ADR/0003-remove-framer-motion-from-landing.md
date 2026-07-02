# ADR-0003: Remove framer-motion from the public landing page

**Status:** Accepted
**Date:** 2026-07-02

## Context

`DESIGN.md` §7 specifies scroll-triggered `fadeInUp` reveals, "slow and
smooth, never fast or playful." `ARCHITECTURE.md`'s frontend stack names
framer-motion as the app's animation library. The first implementation of
the landing page's scroll reveals used framer-motion's `motion.div` /
`whileInView` / `staggerChildren` directly.

## Problem

A real Lighthouse audit (Chrome 149 headless, this environment) measured
the framer-motion implementation at: page JS **42kB** (vs. 1.8kB before any
animation), First Load JS **129kB**, **Total Blocking Time 1,240ms**, and a
Performance category score of **66/100** — driven almost entirely by TBT
(script-evaluation time for the vendor chunks framer-motion pulled in).

## Options considered

1. **Keep framer-motion**, accept the TBT cost as the price of using the
   documented animation library.
2. **Reimplement the same visual behavior** (fadeInUp, staggered,
   once-only trigger on scroll into view) using a plain
   `IntersectionObserver` + CSS `transition`, with no new dependency.

## Decision

Option 2, scoped specifically to the public Landing Page
(`components/shared/Reveal.tsx`). framer-motion stays installed —
`ARCHITECTURE.md`'s pick isn't being reversed, just not loaded on this one
page.

## Why this option was chosen

Measured, not assumed: after the rewrite, page JS dropped to **2.23kB**
(back to pre-animation baseline), and TBT measured **0ms** under
`--throttling-method=provided` (real, unthrottled timing) with a
Performance score of **100**. The visual result is identical — same
fadeInUp curve, same stagger, same "once, on scroll into view" behavior —
DESIGN.md's requirement is satisfied exactly, just without the JS cost. The
landing page is uniquely performance-sensitive: its entire job (per
`ROADMAP.md`'s Week 3 goal and `CONTENT_SYSTEM.md`'s traffic-driving
strategy) is to convert cold, often-mobile visitors from social/search
into waitlist applications — every extra millisecond of blocking JS is a
direct hit to that conversion funnel.

## Trade-offs

- Two animation systems now coexist in the codebase: a lightweight
  CSS/IntersectionObserver approach (`Reveal.tsx`) for the public landing,
  and framer-motion available (not yet used) for the authenticated
  Platform pages in Stage 2+, where richer gesture/layout animation may be
  worth the weight.
- A future developer must know *which* system to reach for on which kind
  of page — documented explicitly in [UI.md](../UI.md) to prevent
  reintroducing framer-motion on public pages by habit.
- `Reveal.tsx`'s stagger implementation requires an explicit `index` prop
  per item (no automatic `nth-child`-based delay) — slightly more
  verbose call sites than framer-motion's `staggerChildren`, in exchange
  for zero runtime cost.

## Future review conditions

- Revisit if a future **public-facing** page genuinely needs something
  framer-motion-only provides (drag interactions, shared-layout
  animations, complex orchestration) — re-measure the actual TBT cost at
  that time rather than assuming it's still prohibitive; framer-motion's
  bundle size may improve in future major versions.
- Revisit if `Reveal.tsx`'s manual-index stagger pattern becomes
  error-prone as more sections are added — consider a small
  context-driven auto-index helper before reaching for framer-motion.
