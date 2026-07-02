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

## Initiation Ritual not built — approval grants Level I directly (`v0.2`)

`PRODUCT.md` §1 Stage 2 specifies a mandatory 5-step ritual between
approval and receiving Level I. Not built — approving an application in
`app/api/admin/applications/[id]/route.ts` grants Level I + `active`
status immediately, no gate. Deliberate `v0.2` scope simplification (see
`DECISIONS.md`, 2026-07-02), expected to land in `v0.3` once the Hall UI
exists to host the ritual steps.

## `(auth)/apply/` folder purpose is unclear

`ARCHITECTURE.md` §7's folder plan lists `app/(auth)/apply/` as "форма
заявки" (application form) — but the actual waitlist application form
lives embedded in the Landing page (`app/(landing)/page.tsx`'s Apply
section), matching `DESIGN.md` §6's Landing Page spec exactly (a single
scrolling page with the form at the bottom). It's unclear whether
`(auth)/apply/` is meant to be a *separate*, standalone `/apply` route
(e.g. for direct-linking from marketing instead of the full landing), or
just an artifact of the original folder plan that predates the landing's
actual single-page design. **Not resolved — needs Max's input**, not a
guess. The folder remains empty.

## Username is auto-generated; no self-edit flow exists

The application form never collects a username (not specified anywhere in
`DESIGN.md`/`PRODUCT.md`). `lib/utils/codes.ts#generateUsernameFromEmail`
derives a placeholder from the applicant's email on approval. There's no
"edit my profile" page yet for a member to change it (or their bio,
avatar via the profile page rather than the Hall, etc.) — avatar upload
currently lives on `/hall` somewhat awkwardly, since there's no dedicated
settings page. Expected to be resolved as part of the Initiation
Ritual / full Hall UI (`v0.3`).

## Supabase Auth user creation isn't atomic with the `users` row write

`app/api/admin/applications/[id]/route.ts`: if Supabase Auth user creation
succeeds but the follow-up Prisma transaction (creating the `users` row,
marking the application approved) fails, there's an orphaned
`auth.users` row with no matching `public.users` row. Logged loudly via
`console.error` for manual reconciliation — there's no automated recovery.
Low risk at current scale (one admin, low volume) but should be revisited
before this becomes a high-throughput flow.

## `401`/`403` conflated in the admin API

`requireAdmin()` returns `403` whether the caller is anonymous or
logged-in-but-not-admin — see [docs/API/README.md](docs/API/README.md).
Fine for now (no client currently needs to distinguish the two), but
worth splitting if a client ever wants to show "log in" vs. "you don't
have access" differently.

## Avatar upload is wired but unverified

`app/api/uploadthing/`, `lib/utils/uploadthing.ts`,
`components/shared/AvatarUploadButton.tsx` are all in place and build
cleanly, but `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID` are empty — same
blocked-on-Max pattern as Resend/Supabase. **Cannot be verified
end-to-end** (a real upload, a real `onUploadComplete` write) until Max
provisions an Uploadthing account.

## Blocked on Max (accounts Claude cannot create)

- Vercel project + domain (needed for any deployment at all)
- Supabase project (needed for `DATABASE_URL`/`DIRECT_URL` **and** real
  Auth — as of `v0.2`, this blocks login/admin/Hall/profile working
  end-to-end, not just the database)
- Resend account + verified sending domain (needed for `RESEND_API_KEY`)
- Uploadthing account (needed for `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID`)

These aren't "debt" in the sense of a shortcut taken — they're
external dependencies the implementer has no way to self-serve. Tracked
here so they stay visible, not because they represent a compromise.
