# Technical Debt

Known compromises, temporary implementations, and future work — recorded
here so nothing survives only in a chat transcript or someone's memory.
Each item should eventually become a `BACKLOG.md` entry once it's actually
scheduled; until then, it lives here as "known, not forgotten, not yet
prioritized."

## Placeholder brand assets

- **`components/ui/Logo.tsx`** — the OC monogram is drawn as outlined
  Cinzel-glyph SVG text (stroke, double-contour), not Max's final vector
  brand asset. Visually close to spec but not pixel-accurate.
- **`lib/utils/ogIcon.tsx`** (PWA icons) and
  **`app/(landing)/opengraph-image.tsx`** (social share image) — same
  placeholder monogram, generated at request/build time via `next/og`
  rather than a real static asset.
- **Fix:** swap all three for the real vector asset once Max provides it.
  No structural change needed — `Logo.tsx`'s API can stay the same;
  `ogIcon.tsx`/`opengraph-image.tsx` would switch from JSX-drawn glyphs to
  loading the real asset.

## Favicon inconsistency

`app/favicon.ico` is still the default `create-next-app` scaffold icon
(not the OC monogram) — it takes priority over the custom
`/icons/icon-192.png` route for the actual browser tab icon, so the tab
icon currently doesn't match the brand. **Fix:** replace with an
`app/icon.tsx` (using the same `renderIcon()` helper) once the real brand
asset exists, or at minimum swap in a monogram-based `.ico` sooner if this
becomes visibly embarrassing before then.

## PWA: manifest exists, service worker doesn't

`public/manifest.json` and the app icons are wired up, but `next-pwa` is
installed and **not** activated in `next.config.mjs` — there's no service
worker, no offline support, no "Add to Home Screen" install prompt beyond
what the manifest alone provides. This was deliberately deferred in `v0.1`
to avoid debugging service-worker caching on top of everything else in the
same pass. **Fix:** wire `next-pwa` into `next.config.mjs` and verify
offline behavior before this app is positioned as "feels like an app" per
`CLAUDE.md`'s stated goal — currently tracked for `v0.2` or later in
`BACKLOG.md`.

## No database provisioned yet

`DATABASE_URL`/`DIRECT_URL` in `.env.local`/`.env` are placeholders. Every
`/api/waitlist` submission currently returns `503`. This is expected, not
a bug — see [TECH_DEBT.md → blocked-on-Max](#blocked-on-max-accounts)
below. No migrations have ever been run against a real database; the first
real `prisma migrate dev` will need care (verify no schema drift from
what's in `schema.prisma` now).

## No email sending yet

`RESEND_API_KEY` is empty; `lib/utils/email.ts` no-ops safely. Same
blocked-on-Max category as above.

## No rate limiting

`ARCHITECTURE.md` §9 calls for rate limiting via Upstash Redis on all API
endpoints. `/api/waitlist` is public and currently has none — once a real
database is connected, it's open to spam/abuse. **Should be prioritized
before or immediately after the database goes live**, not deferred
indefinitely.

## No automated tests

Everything shipped in `v0.1.0` was verified manually (production build,
live preview screenshots, `curl` against the API, a real Lighthouse
audit) — there is no unit/integration/e2e test suite and no CI pipeline.
Acceptable for a single-page landing site; **not** acceptable once
authentication, payments, and user-generated content exist (`v0.2+`) — a
testing strategy should be decided (and get its own ADR) before then.

## `Waitlist.source` is unstructured

Free-text field, not a fixed enum — see
[ADR-0004](docs/ADR/0004-extend-waitlist-schema.md). Fine for now; may
need to become structured once the content/growth strategy
(`CONTENT_SYSTEM.md`) settles on a fixed set of acquisition channels worth
reporting on separately.

## Footer legal links are placeholders

Privacy/Terms/Contact in the landing footer all point to `#` — there are
no actual pages behind them yet. Cosmetically fine for a waitlist-stage
landing; **must** be real before the platform actually onboards paying/
data-collecting members.

## `NEXT_PUBLIC_APP_URL` unset

`metadataBase` in `app/layout.tsx` falls back to `http://localhost:3000`
when this env var isn't set — meaning OpenGraph/canonical URLs will
resolve incorrectly (to localhost) if deployed without setting it. **Must
be set in Vercel's environment variables at deploy time.**

## Blocked on Max (accounts Claude cannot create)

- Vercel project + domain (needed for any deployment at all)
- Supabase project (needed for `DATABASE_URL`/`DIRECT_URL`)
- Resend account + verified sending domain (needed for `RESEND_API_KEY`)

These aren't "debt" in the sense of a shortcut taken — they're
external dependencies the implementer has no way to self-serve. Tracked
here so they stay visible, not because they represent a compromise.
