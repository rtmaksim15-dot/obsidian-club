# UI — Design System Reference (this codebase)

> The canonical, complete visual spec is Max's `DESIGN.md` (iCloud package).
> This page is the **practical, in-repo reference** for how that spec is
> actually implemented here — what class/token to reach for, and what
> already exists. If a design need isn't covered here or in `DESIGN.md`,
> that's a gap: flag it, don't invent a new color or pattern.

## The hard rules (do not violate without an ADR)

1. Colors: **only** CSS variables (`var(--color-*)`) or `ob-*` Tailwind
   tokens. Never a raw Tailwind color (`blue-500`, `gray-100`, etc.) and
   never a hardcoded hex outside `globals.css`/`tailwind.config.ts` — the
   one deliberate exception is `lib/utils/email.ts` and the `next/og`
   image generators (`lib/utils/ogIcon.tsx`, `opengraph-image.tsx`), which
   can't consume CSS variables and inline the brand hex values instead.
2. `Cinzel` — headings, member levels, buttons, brand elements only. Never
   body text.
3. `Cormorant Garamond` — body copy, descriptions, bios.
4. `Inter` — data, labels, numbers, utility UI.
5. `border-radius` — 4px max (`rounded-ob` = 2px is the default for most
   elements). No app-icon-style rounded corners.
6. No white backgrounds anywhere inside the platform.
7. Buttons are uppercase with letter-spacing.
8. Skeleton screens for loading states, never spinners.
9. Motion: slow and premium (see below) — never bouncy, never a spinner.

## Color tokens (`app/globals.css` `:root`, mirrored as `ob-*` in `tailwind.config.ts`)

| CSS variable | Tailwind class | Hex | Use |
|---|---|---|---|
| `--color-bg-primary` | `bg-ob-black` | `#0A0908` | Page background |
| `--color-bg-secondary` | `bg-ob-dark` | `#111009` | Cards |
| `--color-bg-elevated` | `bg-ob-elevated` | `#1A1816` | Modals, profile card |
| `--color-bg-surface` | `bg-ob-surface` | `#221F1C` | Inputs |
| `--color-accent` | `bg-ob-accent` / `text-ob-accent` | `#8B1A1A` | Primary buttons, accents |
| `--color-accent-hover` | `bg-ob-accent-h` | `#A01F1F` | Hover state |
| `--color-text-primary` | `text-ob-text` | `#EDEAE4` | Headings, primary copy |
| `--color-text-secondary` | — | `#9E9A94` | Body copy, **and** any real link/label that needs WCAG-legible contrast (7.11:1 on the primary bg — see [ADR-0009](ADR/0009-fix-contrast-without-changing-tokens.md)) |
| `--color-text-muted` | `text-ob-subtle`-ish | `#5C5955` | True de-emphasized tags/labels only — **2.86:1 contrast, fails WCAG AA for real copy.** Don't use it for anything a user needs to read — see [ADR-0009](ADR/0009-fix-contrast-without-changing-tokens.md) |
| `--color-gold` | `text-ob-gold` | `#C9A84C` | Achievements, Master/Council, Lord Obsidian |
| `--color-border` | `border-ob-border` | `#2A2724` | Default borders |

## Typography utility classes (`app/globals.css` `@layer components`)

`.text-display`, `.text-h1`, `.text-h2` (all Cinzel, uppercase), `.text-label`
(Inter, uppercase, tracked, for eyebrow/kicker text), `.text-body`
(Cormorant), `.text-caption` (Inter, small — **defaults to
`--color-text-muted`; override the `color` inline if the text needs to
actually be read**, see the contrast note above), `.text-data` (Inter,
numeric).

## Component classes

`.btn-primary` / `.btn-secondary` / `.btn-ghost`, `.card` / `.card-premium`
/ `.card-profile`, `.input` / `.input-label`, `.divider-accent`,
`.status-line`, `.avatar` (+ `.avatar-level-{1..6}` border colors),
`.star-filled` / `.star-empty`. All defined once in `globals.css`; don't
reimplement inline.

## Reusable React components (`components/`)

- **`components/ui/Logo.tsx`** — the OC monogram, rendering the real
  cropped brand image `public/brand/oc-monogram.webp` (see
  [LordObsidian.md](LordObsidian.md#symbolism-the-oc-monogram)). **Raster,
  not vector** — see [TECH_DEBT.md](../TECH_DEBT.md).
- **`components/shared/WaitlistForm.tsx`** — the application form, calls
  `POST /api/waitlist`.
- **`components/shared/Reveal.tsx`** — scroll-triggered fadeInUp. Exports
  `Reveal` (single block), `RevealGroup`/`RevealItem` (staggered grid,
  renders `<div>`s), `RevealList`/`RevealListItem` (staggered **list**,
  renders `<ol>`/`<li>` — use this variant instead of `RevealGroup` inside
  a semantic list, or you'll get an invalid `<div>` between `<ol>` and
  `<li>`). Built on a plain `IntersectionObserver` + CSS transitions, **not
  framer-motion** — see [ADR-0003](ADR/0003-remove-framer-motion-from-landing.md)
  for why.

## Motion

`.animate-fade-in-up` (Tailwind utility, `tailwind.config.ts`) for
on-mount entrances (used once, in the Hero). For scroll-triggered reveals
elsewhere, use the `Reveal*` components above, not framer-motion, on public
/ performance-sensitive pages. `prefers-reduced-motion: reduce` disables
all animation/transition globally (`globals.css`) — don't build motion that
depends on JS to respect this; it's handled at the CSS layer.

## PWA icons / OG image

Generated at build time via `next/og` (`lib/utils/ogIcon.tsx`,
`app/(landing)/opengraph-image.tsx`) rather than static asset files — same
placeholder caveat as the Logo component.
