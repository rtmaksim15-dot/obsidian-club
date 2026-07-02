# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versioning
follows [Semantic Versioning](https://semver.org/) — see
[docs/README.md](docs/README.md#versioning) for how pre-1.0 versions map
to product milestones (`v0.1` = Landing, `v0.2` = Authentication, etc.).

## [Unreleased]

Nothing yet — `v0.1.0` is the current released version.

## [0.1.0] — 2026-07-02

The Landing Page: the public entry point, waitlist application flow, and
this project's engineering foundation.

### Added

- Next.js 14 (App Router) + TypeScript project scaffold, brand tokens
  (colors, Cinzel/Cormorant Garamond/Inter typography, spacing/radius
  rules) wired into Tailwind and `globals.css` per `DESIGN.md`.
- Full folder structure per `ARCHITECTURE.md` §7 (`(auth)`, `(platform)`,
  `(landing)` route groups; `components/`, `lib/`, `prisma/`).
- Complete Prisma data model (`User`, `Room`, `Message`, `Post`, `Event`,
  `Review`, `Referral`, `Achievement`, `RatingHistory`,
  `MarketplaceItem`, `Notification`, `Waitlist`, and related join
  tables) per `ARCHITECTURE.md` §3.
- Landing Page (`app/(landing)/page.tsx`): Hero, Philosophy, "What lies
  inside" (Rooms/Events/Library/Reputation/Marketplace/Local Circles),
  member level ladder (Initiate → Council, with Lord Obsidian above the
  system), and the membership application form.
- `POST /api/waitlist` — validates and persists applications, sends a
  branded confirmation email via Resend (best-effort), avoids
  email-enumeration on duplicate submission.
- Scroll-triggered fadeInUp reveal animation
  (`components/shared/Reveal.tsx`) across the landing sections.
- PWA manifest + generated app icons (OC monogram, via `next/og`).
- OpenGraph/Twitter metadata + generated 1200×630 social share image.
- Vercel Analytics, gated to actual Vercel deployments.
- This documentation framework: `/docs` (Vision, Philosophy, Architecture,
  UX, UI, API, ADR), `CHANGELOG.md`, `DECISIONS.md`, `TECH_DEBT.md`,
  `BACKLOG.md`.

### Changed

- N/A — first release.

### Fixed

- WCAG color-contrast failures on the footer and waitlist disclaimer text
  (`--color-text-muted` measured 2.86:1 on the obsidian background,
  below the 4.5:1 WCAG AA minimum) — see
  [ADR-0009](docs/ADR/0009-fix-contrast-without-changing-tokens.md).
- A console error from Vercel Analytics' script 404ing outside of actual
  Vercel deployments — see
  [ADR-0008](docs/ADR/0008-vercel-analytics-over-ga.md).

### Removed

- framer-motion from the landing page's animation implementation
  (replaced with a lightweight IntersectionObserver + CSS approach) —
  see [ADR-0003](docs/ADR/0003-remove-framer-motion-from-landing.md).
  The dependency itself remains installed for future Platform pages.

### Verified

- Production build clean (`npm run build`).
- Mobile (375px), tablet, and desktop (1280px) layouts checked manually.
- Real Lighthouse audit (Chrome 149 headless): Accessibility 100,
  Best Practices 100, SEO 100. Performance scores 100 under real/provided
  timing; scores lower under this sandbox's simulated-mobile-CPU
  throttling stacking with the sandbox's own constrained hardware — not a
  page-weight issue (see ADR-0003 for the measurement detail).

### Known gaps (see [TECH_DEBT.md](TECH_DEBT.md) for the full list)

Not yet deployed (no Vercel/Supabase/Resend accounts connected — requires
Max), no authentication, no rate limiting, Logo/OG-icon assets are
code-generated placeholders pending final brand vector art.
