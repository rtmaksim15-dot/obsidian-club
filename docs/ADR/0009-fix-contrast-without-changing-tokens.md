# ADR-0009: Fix WCAG contrast failures without changing brand tokens

**Status:** Accepted
**Date:** 2026-07-02

## Context

`CLAUDE.md` §4 and `DESIGN.md` explicitly mark the brand color system
"final — do not change." A real Lighthouse accessibility audit (Chrome
149 headless, axe-core rules) found `--color-text-muted` (`#5C5955`) on
`--color-bg-primary` (`#0A0908`) measuring **2.86:1** contrast — below
WCAG AA's 4.5:1 minimum for normal-size text — flagging the footer
copyright text, the footer's Privacy/Terms/Contact links, and (found by
inspection afterward, not by the same audit, since it was hidden at
`opacity: 0` behind the scroll-reveal at snapshot time) the waitlist form's
"Applications are reviewed manually" disclaimer.

## Problem

A real accessibility defect needed fixing on elements a user actually
needs to read (interactive footer links, a disclaimer relevant to consent)
— but the color system that produced it is documented as locked.

## Options considered

1. **Lighten the `--color-text-muted` token itself** — fixes every use
   site at once, but changes a token `DESIGN.md` calls final, and would
   also affect the token's legitimate uses (true de-emphasized tags/labels
   where low contrast is an intentional visual-hierarchy choice, not a
   defect).
2. **Leave the token as-is**, and at the *specific points of use* where
   real, legible copy was mistakenly styled with the muted tier, switch to
   `--color-text-secondary` (`#9E9A94`, measuring 7.11:1 — comfortably
   passes WCAG AA) instead — a token that was already defined and approved
   in `DESIGN.md`'s own color system, just not the one originally applied
   there.

## Decision

Option 2. Fixed in `app/(landing)/page.tsx` (footer) and
`components/shared/WaitlistForm.tsx` (disclaimer) via an inline
`style={{ color: "var(--color-text-secondary)" }}` override on top of the
existing `.text-caption` class.

## Why this option was chosen

Respects "the brand system is final" literally — no hex value in
`globals.css` or `tailwind.config.ts` changed — while still fixing a real,
measured defect. This isn't inventing a new color: `--color-text-secondary`
was already part of the approved system, designated in `DESIGN.md`'s own
usage table for "descriptions" — the actual bug was that `.text-caption`
(and by extension `--color-text-muted`) got applied to real interactive
copy it was never intended for, not that the color system itself is
broken.

## Trade-offs

- Requires per-use-site awareness going forward: a future developer could
  easily reach for `.text-caption`'s default muted color again for real
  copy, reintroducing the same defect elsewhere. Mitigated by documenting
  the rule explicitly and prominently in [UI.md](../UI.md)'s color-token
  table, not just in this ADR.
- `--color-text-muted` remains genuinely low-contrast and stays
  appropriate *only* for true de-emphasized tags/labels — a future
  contributor must actively judge "is this real copy or a de-emphasized
  label" rather than trusting the class name alone.

## Future review conditions

- If a future, broader accessibility audit (WCAG AAA, or coverage of
  pages beyond the landing) finds `--color-text-muted` misapplied
  elsewhere, apply this same fix pattern.
- If `--color-text-muted` turns out to have *no* legible use case at its
  current value anywhere in the actual UI, escalate to Max as an explicit
  brand-token change proposal — do not unilaterally lighten the token
  itself; that decision belongs to the brand owner, not an engineering
  session.
