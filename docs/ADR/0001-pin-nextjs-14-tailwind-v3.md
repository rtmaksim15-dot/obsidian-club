# ADR-0001: Pin Next.js 14 + Tailwind CSS v3 (not latest)

**Status:** Accepted
**Date:** 2026-07-01

## Context

`DESIGN.md`'s "TAILWIND КОНФИГУРАЦИЯ" section specifies an exact
`tailwind.config.js` written in Tailwind v3 syntax (`module.exports`,
`theme.extend`, JS config file). `CLAUDE.md`/`ROADMAP.md` instruct running
`npx create-next-app@latest`. As of this project's start date,
`create-next-app@latest` scaffolds **Next.js 15 + Tailwind CSS v4**, which
replaced the JS config file with a CSS-native `@theme` block — a
structurally different, incompatible format.

## Problem

"Use the latest framework version" and "use this exact config verbatim"
cannot both be literally true at the same time. One had to give.

## Options considered

1. **Next 15 + Tailwind v4** — scaffold latest, hand-translate DESIGN.md's
   color/font/spacing tokens into v4's `@theme` CSS syntax.
2. **Next 14 + Tailwind v3** — pin both to versions where DESIGN.md's
   config applies exactly as written, zero translation.

## Decision

Option 2. Pinned `next@14` and `tailwindcss@^3.4` in `package.json`.

## Why this option was chosen

Presented to Max as an explicit choice (framework freshness vs. spec
fidelity); Max chose spec fidelity. Zero translation risk means the design
tokens Max wrote are guaranteed to mean exactly what he specified, with no
chance of a v3→v4 syntax-translation bug silently shifting a color or
spacing value.

## Trade-offs

- Miss Next 15's improvements (partial prerendering, faster builds, etc.)
  and Tailwind v4's performance gains (native CSS engine, faster builds).
- Tailwind v3 will eventually stop receiving updates; this is deliberate
  technical debt, not an oversight (tracked in `TECH_DEBT.md`).
- Every future `npx create-next-app` / dependency-add command must
  explicitly pin versions (`next@14`, not `next@latest`) or this decision
  silently erodes.

## Future review conditions

- Revisit as a deliberate, planned upgrade sprint (not an incidental side
  effect of an unrelated task) once either: Tailwind v3 is formally EOL'd,
  or a specific Next 15-only feature becomes a real product requirement.
- If revisited, DESIGN.md's config must be re-translated to v4 syntax
  *and verified pixel-for-pixel* against the current rendered site before
  merging — not just "config compiles."
