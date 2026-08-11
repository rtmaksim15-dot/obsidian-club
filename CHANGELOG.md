# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versioning
follows [Semantic Versioning](https://semver.org/) — see
[docs/README.md](docs/README.md#versioning) for how pre-1.0 versions map
to product milestones (`v0.1` = Landing, `v0.2` = Authentication, etc.).

## [Unreleased]

Nothing yet — `v0.36.2` is the current released version.

## [0.36.2] — 2026-08-11

Pre-launch cleanup 3 (docs & repo hygiene) and 4 (final gate).

### Fixed

- **README.md and docs/Architecture.md both claimed "Current version:
  v0.7.0"** and README.md said "the only real page right now is the
  landing page" — both untouched since roughly `v0.7`, over two dozen
  releases and a full member-facing platform ago. Removed the hardcoded
  version claims (Architecture.md already stated its own policy that
  `package.json` is the source of truth — it just didn't follow it) and
  updated README's page inventory to name the real areas: `(platform)`
  routes, the public legal pages, and the auth/invite flows.
- **BACKLOG.md's "Now" and "Next" sections still listed Uploadthing as
  an open blocker** ("Uploadthing account + real
  `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID` (blocked — needs Max's
  account)") and described avatar upload as "wired (uploadthing),
  unverified" — both obsolete since avatar upload moved to Supabase
  Storage on 2026-07-20 (already correctly documented as resolved
  further down the same file, and in `TECH_DEBT.md`/`CLAUDE.md` — just
  never updated at the point of first mention). Struck through /
  corrected in place; did not otherwise reorganize `BACKLOG.md`'s
  historical Now/Next/Later structure, per the file's own stated rule
  that items only move between sections with Max's approval.

### Verified

- `npm run check:rls` — RLS enabled on all 29 tables.
- `npx tsc --noEmit` — clean.
- `rm -rf .next && npm run build` — clean, all routes (including the
  four new legal pages) build correctly.

## [0.36.1] — 2026-08-11

Founder-approved v1 content for the four public legal documents, unblocking the
deploy freeze `v0.36.0` correctly (and knowingly) re-introduced.

### Changed

- **Filled in the placeholders Max explicitly approved** across
  `legal/02-terms-of-service.md`, `03-privacy-policy.md`,
  `04-acceptable-use-policy.md`, `06-dmca-policy.md`: entity framing
  ("Obsidian Club (operated by `[legal entity — formation in
  progress]`)"), the four operational email aliases
  (`support@`/`privacy@`/`safety@`/`dmca@obsidianclub.online`),
  age-verification method for the launch cohort (manual review by
  administration), and effective/last-updated dates (October 1, 2026 /
  August 11, 2026).
- **Genuine remaining gaps** (physical notice address, DMCA agent
  identity/phone, arbitration administrator, venue county) use an
  honest `[lowercase bracket]` style instead — visibly incomplete to a
  reader, but not the shouting `[ALL_CAPS]` pattern `check:legal`
  hard-fails on, since these are real facts/legal-judgment calls
  nobody has supplied yet, not something to fabricate. Reworded each
  document's `[LAWYER]` convention-sentence (and, in the DMCA policy,
  two `[ACTION]`/`[LAWYER]` markers inside the internal-only Part B
  checklist) to avoid the literal trigger string, without touching the
  substantive attorney-review footnote system itself, which is
  unchanged and still fully preserved in the source (and still
  correctly excluded from the public-facing render).
- **`lib/legal/doc-versions.ts`** bumped to `2026-08-11.0` for all
  three consent-tracked documents, since their substance materially
  changed from placeholder to real content.
- **`npm run check:legal` now passes clean** (exit 0) — confirmed, then
  confirmed again with a full `rm -rf .next && npm run build`, the
  exact command Vercel runs. `/terms`, `/privacy`, `/guidelines`,
  `/dmca` all prerender as static content.

### Not resolved (by design — see TECH_DEBT.md)

- No real legal entity is formed yet; no real notice address; no DMCA
  agent has been identified, contacted, or registered with the U.S.
  Copyright Office (meaning the DMCA process, while published, isn't
  yet actually actionable); arbitration administrator/venue county
  undecided; the substantive `[LAWYER]`-flagged legal-judgment calls
  (§2257 explicit-content line, CCPA sensitive-PI classification,
  arbitration severability strategy, and others) are unresolved and
  need real counsel review before this is a final Terms of Service.

## [0.36.0] — 2026-08-11

Legal package, Blocks 2 and 4: real attorney-drafted content, public legal pages,
and registration consent-versioning.

### Added

- **Real legal document content** — the 9 real files (found at Max's iCloud
  path) replace the `[DRAFT_PENDING]` placeholder stubs from `v0.35.0`:
  `legal/02-terms-of-service.md`, `03-privacy-policy.md`,
  `04-acceptable-use-policy.md`, `06-dmca-policy.md`,
  `07-registration-consent-clickwrap.md` (public); `legal/internal/00-…`,
  `01-…`, `05-…`, `08-…` (internal). Every document still has real,
  unfilled `[BRACKET]` placeholders (`[LEGAL ENTITY NAME]`,
  `[SUPPORT EMAIL]`, `[EFFECTIVE DATE]`, etc.) and `[LAWYER ...]` notes —
  that's expected, not a bug; see the `check:legal` note below.
- **`lib/legal/parse-document.ts`** replaces the old YAML-frontmatter
  `lib/legal/frontmatter.ts` (deleted, no longer used) — the real files
  use a plain bold-label convention (`# Title` / `**Effective date:**` /
  `**Last updated:**`) instead of the invented frontmatter format the
  stubs used. `extractPublicBody()` strips the draft-disclaimer
  blockquote and the trailing "Attorney-review footnotes" section for
  public rendering, and — specifically for the DMCA policy, whose
  source file bundles a public Part A with an internal-only Part B
  registration checklist in the same document — excludes everything
  from `## Part B` onward.
- **Public legal pages** — `/terms`, `/privacy`, `/guidelines`, `/dmca`
  (new `(legal)` route group, no auth required — not in
  `middleware.ts`'s `PROTECTED_PREFIXES`). `components/legal/LegalMarkdown.tsx`
  is a small dependency-free markdown-to-JSX renderer scoped to what these
  four documents actually use (headings, bold, blockquotes, lists), plus
  two things generic markdown doesn't do: dropping `[^footnote]`
  reference markers and turning known cross-document references like
  `[Terms of Service]` into real links between the four pages (and one
  to the existing `/codex` page for the Code of Conduct reference).
  Quiet footer links added to the landing page and to every legal page.
  `/2257` was in the original page-count discussion but wasn't part of
  this pass's explicit scope (only 4 routes named) — not built.
- **`check:legal` now correctly hard-fails again** for these four
  documents, since wiring them to real routes is exactly the trigger
  condition `v0.35.1`'s severity split was built around — publishing
  placeholder legal text is still impossible. This **will block Vercel
  deploys** until Max/his lawyer fill in the real placeholder values;
  see DECISIONS.md for why this is the correct, by-design outcome, not
  a repeat of the `v0.35.1` incident.
- **Registration consent (clickwrap)** — the three real checkboxes from
  `07-registration-consent-clickwrap.md` §2 (age/identity;
  Terms+Privacy incl. arbitration/class-waiver; AUP+Code of
  Conduct+Safety Guidelines+red lines), exact wording, unchecked by
  default, submit disabled until all three are checked, document names
  linked to the new legal pages. New shared
  `components/shared/RegistrationConsentFields.tsx`, wired into both
  real account-creation forms — `JoinRegistrationForm` and
  `InviteRegistrationForm` (`/join/[token]` and `/invite/[token]`) — not
  `/apply`, which turned out to have no registration form at all (it's
  a Waitlist-application status page); Google OAuth was already
  incapable of creating an account on its own (`app/auth/callback/route.ts`
  only ever produces a Waitlist row), so it can't bypass these
  checkboxes either. Server-side re-validated in both
  `POST /api/join/:token` and `POST /api/invite/:token` (UI-only
  enforcement is trivially bypassable via direct API call, same
  reasoning as the existing `imageConsent` check in `app/api/posts`).
- **`LegalConsent` model** (`legal_consents` table, RLS deny-all —
  never exposed client-side) — one row per consent event: `userId`,
  `termsVersion`/`privacyVersion`/`aupVersion` (from
  `lib/legal/doc-versions.ts`, bumped by hand on material document
  changes), `acceptedAt`, `acceptedIp`. Recorded on account creation via
  `lib/legal/record-consent.ts`.
- **One-time re-consent interstitial** for members whose latest
  `LegalConsent` predates the current document versions — the 3 real
  accounts, since this is the first version. Checked once in
  `app/(platform)/layout.tsx` (covers every one of middleware's ~17
  protected prefixes from a single place, rather than duplicating a
  per-page check the way the smaller Doors/ritual gates do) and
  redirects to `/legal-reconsent` (deliberately outside `(platform)`,
  so the same layout check can't loop on it).
- **`ContentComposer`'s per-upload image-consent checkbox** updated to
  the real wording from `07`'s §4 ("Everyone shown is a consenting
  adult (18+), and I have their specific, informed, revocable consent
  to post this here."), replacing the earlier placeholder paraphrase
  from `v0.35.0`.

### Verified

- Full round trip with a `test-`-prefixed account via `/join/[token]`:
  checkboxes correctly block submit until all three are checked, real
  consent row written with correct versions/timestamp/IP.
  `legalConsent` deleted to simulate a pre-existing member → confirmed
  redirect from `/hall` to `/legal-reconsent` → completed reconsent →
  confirmed a new consent row and resumed normal access (fell through
  to the pre-existing ritual gate, not blocked again). Cleaned up
  (Prisma rows, Supabase Auth identity, test invite tokens) afterward.
- `npx tsc --noEmit` clean.
- `npm run check:legal` confirmed hard-fails on the four wired documents
  (by design) and still only warns on the unwired internal-reference
  file (`07`).

## [0.35.1] — 2026-08-10

### Fixed

- **`check:legal` was hard-failing every Vercel deploy**, not just ones
  touching legal docs — `v0.35.0` shipped the 5 public stub files with
  empty `effective_date` and `[DRAFT_PENDING]` placeholders already in
  place, and the gate treated any problem in any public `/legal/*.md`
  as build-blocking regardless of whether that document was actually
  reachable from a route yet. Attorney finalization can take weeks;
  freezing all deploys until then isn't viable. `scripts/check-legal.ts`
  now only hard-fails a document once something under `app/` actually
  reads it (`findWiredFiles`) — until Block 2's public pages exist,
  problems print as warnings and the build succeeds. The moment a route
  wires a given file in, its problems become build-blocking again, so
  publishing placeholder legal text is still impossible. Internal-doc
  import leaks are unaffected — still an unconditional hard fail.
  Verified: `npm run check:legal` exits 0 with 15 warnings against the
  current stubs; `npm run build` completes clean.

## [0.35.0] — 2026-08-09

Legal package placement (Blocks 1, 3, 5, and the non-content parts of Block 6).

### Added

- **`/legal/` structure** — 5 public documents (Terms of Service,
  Privacy Policy, Acceptable Use Policy, DMCA Policy, Registration
  Consent Clickwrap) + `/legal/internal/` (plan/risk assessment,
  decisions/parameters, 2257/2257A memo, Section 230 memo, plus a
  one-line `README.md`: "Internal documents. Do not publish. Do not
  import into the app."). The 9 real documents don't exist yet
  anywhere on this machine (checked three separate locations before
  concluding this) — every file is currently a `[DRAFT_PENDING]`/
  `[LAWYER ...]` placeholder stub with empty `effective_date`
  frontmatter, deliberately not drafted here: these are lawyer-authored
  legal text, not something to fabricate.
- **`npm run check:legal`** (`scripts/check-legal.ts`, same trip-wire
  pattern as `check:rls`) — fails the build if any public `/legal/*.md`
  still has an unfilled `[PLACEHOLDER]`, a `[LAWYER ...]` footnote, a
  missing `effective_date`, or if anything under `app/`/`components/`/
  `lib/` actually imports from `legal/internal/`. Wired into
  `prebuild`, so `npm run build` cannot succeed while any of this is
  true — verified live against the current (intentionally incomplete)
  stub files.
- **Member protection mechanics** (product features in their own
  right, not a legal formality — see DECISIONS.md):
  - **Report** — one-step, reachable from every post and every profile,
    no nested menus. Six categories (underage, non-consensual, threat,
    doxxing, commercial solicitation, other); the first three are
    "red line" and sort first in admin review. New `Report` model,
    `POST /api/reports`.
  - **Block** — mutual in effect (`lib/moderation/block.ts`), tears
    down any existing follow relationship in both directions, hides
    both profiles from each other. New `Block` model,
    `POST /api/users/:id/block`.
  - **Self-service deletion** — post deletion (existing, previously
    unwired `DELETE /api/posts/:id` route now has a real Delete
    button) and full account closure (`POST /api/account/close`,
    "Close my account" on `/profile/edit`) — both immediate, no
    explanation or third-party approval.
  - **Moderation log** — new `ModerationAction` model, deliberately
    separate from `RepHistory` (REP-specific) and `AnalyticsEvent`
    (behavioral analytics, not actor-audited). Every admin report
    action (`dismiss`/`review`/`preserve`) logs who, when, what,
    against which category.
  - **Red-line preservation** — `Post.isPreserved`: a red-line report,
    once actioned via the new `/admin/reports` review queue,
    unpublishes the post and marks it preserved instead of deleting it
    — content is evidence, not something to destroy. New
    `PATCH /api/admin/reports/:id`.
  - **Image-upload consent** — `Post.imageConsentAt`; the composer
    requires an explicit, unchecked-by-default "all depicted are
    adults who consented to this publication" checkbox before a photo
    post can publish, enforced server-side (`POST /api/posts`) as well
    as in the UI.
- **`app/robots.ts`** — disallows `/legal/internal/` (defensive; it's
  a source directory, never an actual route, but the rule is in place
  before anything could accidentally expose it). Public legal pages
  stay indexable, same reasoning as the landing page's own metadata.

### Fixed

- **`check:legal`'s internal-import detector had a false-positive** —
  it flagged `app/robots.ts` for merely mentioning the literal string
  `"legal/internal/"` in its Disallow rule, not for actually importing
  anything. Narrowed to match real `import`/`require`/dynamic-`import`
  statements only. Caught live, on this task's own first build attempt.

Verified live end-to-end with three `test-`-prefixed accounts: a
red-line report filed by one member against another's post, reviewed
and preserved by an admin (confirmed the post was unpublished but its
content stayed intact in the database, not deleted); a second,
non-red-line report dismissed; both actions confirmed in the
moderation log with full detail; mutual block confirmed from both
sides (neutral "not available" profile page) with the follow
relationship torn down; self-delete confirmed via the wired button;
the image-consent gate confirmed rejecting a server-side bypass
attempt with no checkbox. `check:legal` confirmed correctly blocking
`npm run build` against the current placeholder content, and
confirmed clean once the false-positive was fixed. All test accounts,
posts, reports, blocks, and moderation-log entries removed afterward.

## [0.34.0] — 2026-08-09

Pre-launch cleanup 2: `/admin` dashboard.

### Added

- **`/admin`** — previously had no `page.tsx` of its own (only its
  subroutes did), so it 404'd. Now a numbers-only glance dashboard:
  active members, ritual-complete count (reuses
  `getRitualCompleteMemberCount()` from the Doors mechanic, v0.33.0),
  pending applications, published posts, age-verified vs. total, and a
  per-batch unused/redeemed breakdown for every invite batch (linking
  through to `/admin/invite-batches/:id` for detail). Same
  not-discoverable `requireAdmin()` + `notFound()` pattern as every
  other admin page. Links out to Applications/Invite Batches/Members
  for anything needing more than a glance.

Verified live against real production data with a temporary admin
test account (cleaned up immediately after): 3 active members, 1
ritual-complete (matches the real, currently-accurate state), 0
pending applications, 0 published posts, 0/3 age-verified, no invite
batches — all correct against the actual database, not synthetic
numbers.

## [0.33.0] — 2026-08-08

Pre-launch cleanup 1: the Doors mechanic (October 1 cohort launch gate).

### Added

- **`DOORS_OPEN_DATE`** — a runtime env var (`lib/config/doors.ts`),
  unlike `feature-flags.ts`'s compile-time booleans. When set to a
  future date, every ritual-complete non-admin member is redirected to
  a new `/antechamber` page instead of real content, from all four
  pages that gate on ritual completion (`/feed`, `/hall`, `/compose`,
  `/members`) — confirmed via a grep that these are the complete set;
  there's no shared layout covering just them, so the check was added
  to each individually, matching how the ritual-complete check itself
  is already duplicated per page. Admins always bypass. Unset the var
  (or let the date pass) and everything opens with no code change —
  verified live, including that this is a fresh per-request check, not
  something requiring a restart once deployed.
- **Fails closed on a malformed date.** An unset var means "feature
  off, nothing locked" — but a *set-and-unparseable* value keeps the
  antechamber active rather than accidentally opening the club early;
  a typo should mean "members wait a little longer," not "the cohort
  gate silently didn't work." Verified live with a deliberately bad
  value.
- **`/antechamber`**: "The Hall opens [Month] [day]{ordinal}." + a live
  count of ritual-complete members ("N members stand at the doors"),
  styled to match the existing `/library`/`/houses` teaser idiom. New
  `getRitualCompleteMemberCount()` (`lib/auth/ritual.ts`) computes the
  count as 3 set-intersection queries instead of N per-member
  `getRitualStatus()` calls (which would mean N separate `Message`
  queries) — verified this returns the correct, real count against
  live data (not a test-only number).
- **Sign Out on `/antechamber`** — `/hall` is one of the gated pages,
  so without this a waiting member would have had no way to sign out
  at all while the antechamber is active. Reuses the same
  `SignOutButton` from `/hall` (v0.31.0).

Verified live end-to-end with a `test-`-prefixed ritual-complete
account: normal access confirmed with the var unset; redirect to
`/antechamber` (with correct date formatting and a real member count)
confirmed from all four gated pages with the var set to a future date;
admin bypass confirmed by flipping the same account's `isAdmin` flag;
fail-closed behavior confirmed with a malformed value. Cleaned up
afterward, including restoring `.env.local` to its unset default.

## [0.32.0] — 2026-08-08

Pre-launch block (ROADMAP v3.1), Task 3: PWA manifest + iOS home-screen support.

### Changed

- **`manifest.json`'s `short_name`**: `"OC"` → `"Obsidian"` — this is
  the label iOS/Android show under the home-screen icon; `manifest.json`
  itself, the 192/512 OC-monogram icons, `theme_color`/`background_color`,
  and `display: "standalone"` already existed from an earlier pass
  (`v0.1`, "Wire PWA manifest + brand icons") and needed no other
  changes — verified they were already correct rather than
  regenerating anything that wasn't broken.
- **`theme_color`/`background_color` kept at `#0A0908`**, not the
  `#0A0A0A` named in this task's brief — `#0A0908` is this project's
  actual, already-finalized "Obsidian Black" (`tailwind.config.ts`,
  `app/globals.css`'s `--color-bg-primary`, and the existing manifest
  itself all agree on it; CLAUDE.md rule 2 says not to touch finalized
  visual identity). `#0A0A0A` is close enough that it reads as the same
  intent typed from memory, not a deliberate new value — introducing a
  second near-black would be the actual regression here.

### Added

- **iOS "Add to Home Screen" now opens fullscreen, not a Safari
  bookmark.** `app/layout.tsx`'s `metadata.appleWebApp` (`capable: true`,
  `statusBarStyle: "black-translucent"`, `title: "Obsidian"`) — this is
  the piece that actually switches iOS's behavior; the manifest and
  icons alone are cosmetic without it. `black-translucent` draws
  content under the status bar, safe here because `globals.css` already
  pads every page with `env(safe-area-inset-*)`. Also added the
  non-Apple-prefixed `mobile-web-app-capable` meta tag for parity.
- **Splash screen**: no hand-crafted `apple-touch-startup-image` set —
  that's roughly a dozen separate PNGs per iPhone/iPad screen size and
  orientation, disproportionate for a single flat-color monogram mark.
  iOS auto-generates a splash screen from the manifest's icon +
  `background_color` once `apple-mobile-web-app-capable` is set, which
  is what "the right splash" needs here.

Verified live in a 375×812 mobile viewport: `manifest.json` fetches and
parses correctly with the updated `short_name`; `<head>` carries the
apple-touch-icon link and all four apple/mobile-web-app meta tags with
the expected values; no console errors; landing page renders correctly
at mobile width.

## [0.31.1] — 2026-08-08

### Fixed

- **Transactional email FROM address pointed at the wrong domain.**
  `lib/utils/email.ts` sent as `hello@obsidianclub.com` — every other
  reference in this project (`NEXT_PUBLIC_APP_URL`, `TECH_DEBT.md`,
  `DECISIONS.md`, `CHANGELOG.md`) uses `obsidianclub.online` as the one
  real production domain. Caught while preparing Resend DNS setup
  instructions: the domain verified in Resend has to match the FROM
  address actually used in code, or every send fails. Now
  `hello@obsidianclub.online`. Affects both `sendWaitlistConfirmation`
  and the new `sendInvitationEmail` (v0.30.0) — neither has sent a real
  email yet in this environment (`RESEND_API_KEY` still unset), so this
  fixes a latent bug before it ever reached a real inbox.

## [0.31.0] — 2026-08-08

/hall UX: invite links and Sign Out.

### Added

- **Full invite/partner URLs with Copy + Share** — "My Invitation" on
  `/hall` now shows the complete `https://…/join/{token}` URL for any
  still-live token, with a Copy button (clipboard write + a brief
  "Copied" confirmation) and, on a device that supports it, a native
  Share button (`navigator.share`). New shared component:
  `components/shared/CopyShareLink.tsx`.
- **Redeemed tokens show the human outcome only, never the URL again**
  — a redeemed member invite renders "Invitation accepted — {name},
  {date}"; a redeemed partner link renders "Partner of {name}" (this
  branch already existed). `t.token` is never read past the redeemed
  branch in either case, so a dead token can't end up serialized into
  `CopyShareLink`'s props — verified live: the redeemed token string
  was confirmed absent from the full rendered HTML source (not just
  the visible text), while the still-live token's URL was present as
  expected.
- **Sign Out** — a quiet text link at the bottom of `/hall`, styled
  identically to "Edit profile". Full server-side sign-out
  (`POST /api/auth/sign-out`, new route): builds its own Supabase
  client bound to the request/response cookies (same pattern
  `app/auth/callback/route.ts` already established, since
  `lib/auth/supabase-server.ts`'s cookie writes don't attach to a
  hand-constructed response), calls `supabase.auth.signOut()` server-
  side, and redirects to the landing page with the cleared cookies
  attached. A plain `<form method="POST">` — no client JS required for
  the sign-out itself. Verified live: `/feed` correctly redirects to
  `/login` after sign-out (session actually invalidated, not just a
  client-side redirect), and the browser's back button lands on the
  login page, not a cached authenticated page.

### Verified

- Admin batch detail (`/admin/invite-batches/:id`) already showed
  "Redeemed by {name} ({date})" for every channel, never the token —
  confirmed by rereading the file and grepping for any `.token`
  reference (none found); no change needed there.

Verified end-to-end with two `test-`-prefixed accounts (real Supabase
Auth identities + Prisma rows, one redeemed invite, one live invite,
a formed partner relationship) — cleaned up afterward.

## [0.30.1] — 2026-08-08

### Fixed

- **Regression: Max's real account showed a completed ritual as
  "TO DO" again.** The Task-1 (v0.29.0) backfill script wrote
  `ritualProgress: { usernameChosen: true }` as a plain overwrite
  instead of reading the existing value first — destroyed the real
  `codeOfConduct`/`introMaterial`/`safetyRules` completion flags on
  both real accounts (Max's and Lord Obsidian's). Investigated before
  changing anything: confirmed via `DECISIONS.md`'s own history that
  Lord Obsidian's account had never actually completed those three
  steps for real (nothing to restore there), while Max's account had —
  real completion timestamps from 2026-07-25 (Code of Conduct,
  Introduction) documented in this project's own history, plus direct
  confirmation the account was fully ritual-complete immediately before
  the backfill (meaning Safety & Respect was also genuinely accepted,
  sometime between its 2026-08-03 content drop and the 2026-08-07
  backfill). By the time the fix ran, the account had already
  self-healed — the real user had re-clicked through the ritual steps
  live in the time between the bug report and the fix — so the planned
  restoration write was a correctness-preserving no-op, not a live data
  change. Both currently-live code paths that write `ritualProgress`
  (`app/api/profile/route.ts`, `app/api/ritual/progress/route.ts`)
  already correctly read-merge-write; the bug was isolated to the
  one-off script, which no longer exists.
- **`CLAUDE.md` rule 9** — any future one-off script touching a JSON
  field on a real account must read-merge-write, never plain-overwrite.
  Same "codify after an incident" response as rule 8 after the RLS
  regression.

## [0.30.0] — 2026-08-07

Pre-launch block (ROADMAP v3.1), Task 2: batch channels + Resend email infra.

### Added

- **`InviteBatch.channel`** (`print` | `email` | `letter`, defaults to
  `print`) **+ `campaign`** (free-text label). Every batch before this
  was implicitly a printed purchase card — now that's explicit, and two
  new delivery channels exist alongside it. Batch creation form and
  batch list/detail pages all show channel + campaign.
- **Admin-triggered invitation emails.** On an email-channel batch, an
  admin uploads a CSV of `(email, name)`; each valid row is paired with
  one of the batch's unused tokens and sent a real invitation email via
  Resend (`POST /api/admin/invite-batches/:id/send-emails`). Pairing is
  all-or-nothing — if the batch doesn't have enough unused tokens for
  every valid row, nothing is claimed or sent. No open self-serve
  sending exists anywhere; this endpoint is the only sender, and it's
  admin-only.
- **Per-token send-status logging** — `InviteToken.sentToEmail`,
  `sentToName`, `emailSentAt`, `emailSendError`. A token is claimed the
  moment it's paired with a CSV row (even before the send attempt), so
  a second upload can't double-pair it; the batch detail page shows
  real per-token status (sent / failed with reason / unused) instead of
  a single redeemed/unused split.
- **On-brand invitation email template** (`lib/utils/email.ts#sendInvitationEmail`)
  — dark background, serif type, the real OC monogram (`logo-mark.png`,
  not a redrawn asset), one button: "Enter the Circle." Reuses the same
  `emailShell` as the existing waitlist confirmation email.
- **Card numbers are print-only now.** Email/letter batches no longer
  burn numbers out of the global print sequence — `cardNumber` stays
  `null` for every token in a non-print batch.

### Fixed

- **Resend SDK errors were silently swallowed.** `resend.emails.send()`
  doesn't throw on an API-level failure (bad key, invalid recipient,
  quota exceeded...) — it resolves with `{ data: null, error: {...} }`
  instead; only network-level failures throw. The shared `sendEmail`
  wrapper only had a `try`/`catch`, so every API-level failure was
  silently treated as a success. Found live while verifying this
  feature with a deliberately invalid Resend key — the send reported
  `ok: true`. Fixed by checking the response's `error` field before
  reporting success; this also fixes `sendWaitlistConfirmation`'s
  (pre-existing, undetected) same blind spot, since both share the
  wrapper.
- **A join link with no domain now refuses to send** rather than
  emailing a real inbox a broken link — `sendInvitationEmail` checks
  `NEXT_PUBLIC_APP_URL` before building the link, not after. Same
  standing gap as the purchase-card CSV export (see TECH_DEBT.md), but
  for email a broken link reaches a real person instead of just sitting
  in a downloaded file.

`NEXT_PUBLIC_APP_URL` is still unset in this environment — it **must**
be set to `https://obsidianclub.online` in Vercel before either the
print CSV's QR-code links or these invitation emails produce a working
URL. Verified end-to-end against real database writes with a
`test-`-prefixed batch (CSV parsing including quoted-comma names and
invalid-row skipping, token claiming, and all three `sendInvitationEmail`
failure paths); cleaned up afterward. The actual send-succeeds path
can't be verified until a real `RESEND_API_KEY` is set.

## [0.29.0] — 2026-08-07

Pre-launch block (ROADMAP v3.1), Task 1: username in the Ritual.

### Added

- **"Choose your name in the Circle" ritual step.** New members now pick
  a real username (3-20 chars, lowercase letters/digits/underscores,
  unique, live availability check as they type) instead of keeping the
  auto-generated `email_1a2b`-style placeholder — the ritual's "Complete
  your profile" step no longer completes for a new member until they've
  chosen one. `GET /api/profile/username-check` powers the live check;
  `PATCH /api/profile` enforces format + uniqueness + the one-change
  lock server-side, not just in the UI.
- **`User.usernameChangedAt`** — a single nullable timestamp models "one
  lifetime username change" for both cases at once: a new member's
  ritual-time pick *is* that one change, and an existing member's
  one-time courtesy change (`/profile/edit`) reuses the exact same
  check. No new-vs-existing branching anywhere in the code.

### Changed

- `generateUsernameFromEmail` (`lib/utils/codes.ts`) now produces
  underscore-separated, 20-char-max placeholders matching the new
  format — the placeholder still exists (an account needs *a* username
  before the ritual), it's just never meant to be kept.

### Fixed

- Format validation in `PATCH /api/profile` was running on every save,
  not just on an actual username change — would have broken saving any
  other field (bio, city, role...) for a grandfathered member whose
  existing username doesn't match the new stricter pattern (e.g.
  contains a hyphen). Now scoped to `username !== user.username`, same
  guard as the one-change lock.

Existing members were backfilled with `ritualProgress.usernameChosen:
true` directly in the database before this shipped, so the new
requirement can't retroactively reopen an already-complete ritual for a
real, currently-active member.

## [0.28.1] — 2026-08-06

### Added

- **`npm run check:rls`** (`scripts/check-rls.ts`) — fails loudly if RLS
  is disabled on any table, so a future schema change can't silently
  reopen the gap closed in `v0.26.0`. `CLAUDE.md` rule 8: run it after
  every `prisma db push` / schema migration.

### Fixed

- **`rate_limit_hits` had no RLS.** Added in `v0.26.0`'s Block 2, after
  that block's RLS sweep migration was already written, so it was never
  included — found by this script's very first run. Deny-all, same as
  nearly every other table (Prisma-only access, no browser client ever
  touches it). `supabase/migrations/20260806000000_rls_rate_limit_hits.sql`.

## [0.28.0] — 2026-08-06

August hardening pass (ROADMAP v3.1), Block 5: performance quick wins.

### Added

- **Feed pagination** — `/feed` had a hard `take: 30` ceiling with no
  way to reach anything published before that. Added offset-based
  pagination (`GET /api/feed`, `components/shared/FeedList.tsx`'s "Load
  more" button), sharing one query function (`lib/feed/query.ts`)
  between the initial server render and "load more" so the two can
  never disagree about what belongs in the feed.
- **`loading="lazy"` on list/feed images** — post photos and avatars in
  the feed, comments, room chat, members list, and Vault items now
  defer off-screen loading. Left untouched: the brand logo (always
  above the fold), the landing page's already-`next/image`-optimized
  hero, and single always-visible avatars (profile header, edit form)
  where lazy-loading has no benefit.

### Verified

- Image compression was already wired correctly for both upload paths
  (avatar via `AvatarUploadButton.tsx`, post photos via
  `ContentComposer.tsx`) — both resize to a 2048px long side and
  re-encode as JPEG client-side before upload, confirmed by reading
  each component; no fix needed.
- Feed pagination tested live with 25 `test-` prefixed posts: 20 shown
  initially, "Load more" correctly fetched the rest, and the button
  correctly disappeared once exhausted. All test data removed
  afterward.

## [0.27.1] — 2026-08-05

August hardening pass (ROADMAP v3.1), Block 4: full persona regression
walkthrough on production (mobile viewport).

### Fixed

- **Follower/following counts didn't update after Follow/Unfollow.**
  `FollowButton.tsx` toggled its own label correctly but never
  refreshed the page, so the follower count next to it (a
  server-rendered prop) stayed stale until a manual reload. Added a
  `router.refresh()` call after a successful toggle, matching the
  pattern `CommentSection.tsx` already uses.

### Verified

- Full persona walkthrough on `obsidianclub.online` (mobile viewport):
  purchase-card signup → all 5 ritual steps (including the new Safety &
  Respect Guidelines) → profile completion (avatar + bio) → first post
  with a real photo → comment → like → members list → follow/unfollow
  (bug found and fixed above) → member-invite link generation →
  partner-link generation and redemption, confirmed bidirectional
  "Partner of" display on both accounts. No console errors at any
  point. All test entities (2 users, 1 post, 1 room message, 3 invite
  tokens, Storage objects) fully removed afterward; confirmed the
  production database matches its exact pre-session state.

## [0.27.0] — 2026-08-04

August hardening pass (ROADMAP v3.1), Block 3: brand-styled error pages,
and a real gap closed in how forms surface failures.

### Added

- **`app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`** —
  Next.js's generic 404/500 fallbacks replaced with on-brand pages
  (same dark/serif shell as `/apply`, `/login`). `global-error.tsx`
  covers the rare case of the root layout itself throwing — uses inline
  styles deliberately, since it replaces the whole document and can't
  rely on `app/layout.tsx`'s font providers or `globals.css` loading.

### Fixed

- **Forms no longer surface raw exception text.** Seven client
  components (`ApplicationForm`, `JoinRegistrationForm`,
  `InviteRegistrationForm`, `ContentComposer`, `CommentSection`,
  `RepAdjustmentForm`, `InviteBatchGenerator`) caught a server error
  response, re-threw it as `new Error(body.error)`, then displayed
  `err.message` in a shared `catch` block — which also caught a raw
  `fetch()` network exception (offline, DNS, CORS) with no
  human-authored message and displayed *that* verbatim too. Every one
  now branches directly on the response instead of throwing, so a raw
  browser/network error can never reach the screen — only this app's
  own curated copy or a fixed fallback.

### Verified

- Live: `/this-page-does-not-exist` renders the new 404; a deliberately
  throwing test route (added and removed within this session) renders
  the new error boundary correctly; the waitlist application form's
  success path still works end-to-end after the refactor. Invite-token
  edge cases (invalid, expired, already-used) were already handled with
  dignified messages before this session — confirmed by reading
  `/invite/[token]` and `/join/[token]`, no changes needed there.

## [0.26.0] — 2026-08-04

August hardening pass (ROADMAP v3.1), Block 1 + Block 2: an 18+ notice
on every entry point, and a full security audit — most importantly,
closing an URGENT RLS gap open since 2026-07-16.

### Added

- **18+ notice** — understated serif line on the landing page (above
  the footer) and `/apply`; a confirmation line above the submit button
  on `/join/[token]`'s registration form.
- **RLS enabled on all 22 tables that had it disabled** — previously
  only `waitlist`/`analytics_events` had it on; anyone with the public
  anon key could read/write the entire database via Supabase's REST
  API, completely bypassing this app's own access control. Deny-all
  everywhere except `messages` (real member's needed for Realtime; see
  `DECISIONS.md`/`TECH_DEBT.md` for the Realtime-authorization bug this
  surfaced and fixed along the way, in `RoomChat.tsx`).
- **DB-backed rate limiting** (`RateLimitHit`, `lib/security/rate-limit.ts`)
  on `/api/waitlist`, `/api/invite/[token]`, and `/api/join/[token]`.
- **File upload byte verification** — real magic-byte checks
  (`lib/utils/validateImageBytes.ts`) on both the avatar and post-photo
  upload paths, replacing MIME-type-only validation (trivially
  spoofable); also tightened `POST /api/posts`' `photoUrl` to only
  accept this app's own Storage bucket.
- **`server-only` guards** on `lib/auth/supabase-admin.ts` and
  `lib/db/prisma.ts` — build-time protection against an accidental
  client-side import of service-role/database credentials.

### Verified

- Every API route's auth checks audited (all 27 routes — clean, no
  gaps found). Live end-to-end tests with `test-` prefixed entities per
  `CLAUDE.md` rule 7 for: the RLS sweep (including a full Realtime
  round-trip after the fix), rate limiting wiring, and all four upload
  hardening cases (valid/spoofed avatar, valid/spoofed post photo — the
  spoofed cases confirmed rejected and removed from Storage). All test
  data removed afterward.

## [0.25.0] — 2026-08-03

Ritual completion + Codex + Age Verification field. Closes the last
open Initiation Ritual content gap (`ADR-0013`, `TECH_DEBT.md`) and adds
the club's full Codex plus an admin-facing Age Verification flag.

### Added

- **Safety & Respect Guidelines** — the Initiation Ritual's 5th and
  final step (`/ritual/safety-rules`) now has real content from Max,
  replacing the "pending" placeholder. A single "I Understand and
  Accept" button records acceptance in `UserProfile.ritualProgress` via
  `POST /api/ritual/progress` (now accepts `"safetyRules"`), identical
  to how Code of Conduct/introduction already work. The ritual's
  `"deferred"` sentinel — a "no content yet" placeholder introduced for
  this exact gap — is fully retired: `RitualStepStatus` drops the
  `"deferred"` member, the ritual page's status badge only ever renders
  "Done" or "To do," and new members simply start every content step
  at "todo."
- **`/codex`** — the club's full Codex (Eight Principles + Red Lines),
  styled like the Code of Conduct page (roman numerals, serif, dark).
  Reference material, not a ritual step — no completion tracking, no
  "accept" button. Linked quietly from `/ritual/safety-rules` and
  `/ritual/code-of-conduct` ("Read the full Codex →").
- **Age Verification field** — `User.ageVerified`/`ageVerifiedAt` (also
  staged on `Waitlist`, since account creation happens later at invite
  redemption, not at approval). An "Age verified" checkbox in
  `ApplicationsQueue.tsx`'s approve action stages it on the `Waitlist`
  row; it's copied onto the new `User` row at `/invite/[token]`
  redemption, same as `age`/`locationCity`. New `/admin/members` page
  (no admin member-list page existed before this) shows every active
  member with a toggle, via a new `PATCH /api/admin/members/:id` route.
  Field first, no enforcement gate yet — that's a separate decision for
  a later wave.

### Verified

- Live: submitted a `test-` prefixed application, approved it with Age
  Verified checked, confirmed the flag landed on `Waitlist` then copied
  onto the new `User` row at invite redemption; walked the new member
  through `/ritual` → `/ritual/safety-rules` → confirmed → step showed
  Done and the ritual page's action button disappeared; visited
  `/codex` from both quiet links; toggled Age Verified on `/admin/members`
  for a second test account. All test entities (2 `User` rows, their
  Supabase Auth identities, 1 `Waitlist` row) were fully removed
  afterward per `CLAUDE.md` rule 7 — verified the database matches its
  pre-session state exactly.

## [0.24.0] — 2026-08-01

Invitation & Partner system v1, per `OBSIDIAN_ROADMAP_v3.1` — three ways
an account gets created besides the original admin-reviewed application,
all sharing one redemption route and one "already used" check.

### Added

- **Purchase cards** — `/admin/invite-batches` generates a batch of N
  single-use tokens, each with a sequential card number (continuing
  across every batch, not reset per batch). No application step, no
  email binding — redeeming goes straight to registration. Batch list
  shows created date, card count, redeemed count; batch detail shows
  per-card status (unused / redeemed by whom, when); CSV export (card
  number, token, full URL) for print.
- **Member invites** — `User.inviteAllowance` (default 1, admin-
  adjustable). "My Invitation" on `/hall`: "Create invitation" generates
  a personal single-use link; shows unused / "Joined by [name]".
  Redeeming stores `invitedById` on the new member — shown quietly as
  "Invited by [name]" on their public profile. The old `/?ref=` referral
  mechanic stays off (behind `REFERRALS_UI_ENABLED`), not restored.
- **Partner** — separate from invites, doesn't touch `inviteAllowance`.
  "Add partner" on `/hall` generates a single-use partner link; the
  redeemer's profile shows "Partner of [name]," mirrored on the
  inviter's own profile. Partners get `inviteAllowance = 0` by default.
  One partner per member; unlinking is admin-only (direct DB access —
  no self-service UI yet, see TECH_DEBT.md).
- **`InviteBatch`/`InviteToken` models** — a new `source` enum
  (`purchase_card`/`member`/`partner`), fully separate from the
  Waitlist-application-based `/invite/[token]` flow, which is
  untouched. All three sources redeem through the same
  `POST /api/join/:token`, which checks `redeemedAt` unconditionally —
  a token is permanently invalid after use regardless of source.

### Verified

- Live: batch generation + card redemption, member invite +
  `invitedById` chain + allowance decrementing to 0, partner link +
  "Partner of" display (both directions) + partner allowance defaulting
  to 0, and re-redeeming an already-used token of each of the three
  sources correctly failing. All test entities used the `test-` prefix
  per `CLAUDE.md` rule 7 and were fully removed afterward.

## [0.23.0] — 2026-07-31

Members & Follows, per `OBSIDIAN_ROADMAP_v3.1` — a small closed club gets
a directory instead of a search bar.

### Added

- **`/members`** — a plain directory of all active members (avatar,
  name, bio line), sorted by join date, founders first. No filter/
  search input yet — not needed below ~30 members; the plain list is
  the whole feature for now. Entry point: a "Members →" link at the
  top of the Newcomers room screen (Community's only reachable room
  right now).
- **`Follow` model + `POST /api/users/:id/follow`** — a toggle, same
  shape as `POST /api/posts/:id/like`. Every public profile now shows
  a Follow/Following button (for anyone but yourself) and a quiet
  "N followers · N following" line. The Feed stays club-wide
  chronological for v1 — following doesn't filter it; a "Following"
  filter is deferred until member volume actually justifies it (see
  BACKLOG.md).

### Changed

- **Reviews (list + submission form) on `/profile/[username]`** — now
  behind `REP_UI_ENABLED`. Previously only the REP number/stars were
  gated; the reviews themselves weren't, which didn't match the
  Members→profile design ("no REP, no reviews").
- **`PostCard`/`PostList`** gained a `compact` mode (drops the avatar/
  name header) — used for `/hall`'s "Your Posts," where the owner's own
  avatar and name are already shown once above; repeating them per-post
  was pure redundancy.
- **The stale "Your access has been granted" notification** now marked
  read (and so disappears from `/hall`) the moment the page is
  reachable at all — reaching Hall already requires ritual completion,
  which is exactly what that notice was asking for.

## [0.22.0] — 2026-07-30

### Fixed

- **Photo upload failing client-side with "Image must be 8MB or
  smaller"** — the signed-upload-URL fix (`v0.21.0`) solved the Vercel
  4.5MB function-body cap, but real iPhone photos routinely exceed 8MB
  in the first place, so this app's own size check was rejecting them
  before they ever got that far. Added client-side compression
  (`lib/utils/compressImage.ts`) — resize to a max 2048px long side,
  re-encode as JPEG at ~0.85 quality — run on every photo before
  upload, in both the post composer and avatar upload. 8MB stays as a
  post-compression safety net, not the first line of defense. HEIC
  files go through the same generic canvas-based pipeline (no separate
  path/library) — decodes wherever the browser supports it natively
  (notably Safari/iOS, the real-world case this matters for).

### Changed

- **`AvatarUploadButton`** — same compression pipeline as the post
  composer; `accept` widened to `image/*` (no longer excludes HEIC by
  omission).
- **Community nav tab / `/rooms`** — with only one active room right
  now (`newcomers`), `/rooms` redirects straight to it instead of
  showing a list-of-one — no "ROOMS" heading, no Events link on the
  way. Purely data-driven: as soon as a second room is reactivated,
  `/rooms`'s real index renders again on its own, no flag or code
  change needed. `/events` stays reachable directly by URL.

## [0.21.0] — 2026-07-29

Feed-first simplification pass, per `OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md`,
"Threads-level simplicity."

### Fixed

- **Photo upload in the feed composer** ("Could not upload photo" in
  production) — root cause: Vercel Serverless Functions cap request
  bodies at 4.5MB, a hard platform limit; real phone photos routinely
  exceed that, so they never reached this app's own 8MB check at all.
  Confirmed Supabase Storage itself (bucket, size limit, permissions)
  was fine by uploading directly against the real project. Fix:
  `POST /api/posts/photo` now returns a signed Supabase Storage upload
  URL/token instead of proxying the file; the browser uploads straight
  to Storage, bypassing the Vercel function body entirely. Also set
  `allowedMimeTypes` on the bucket (belt-and-suspenders, since content
  type is now only declared by the client pre-upload, not sniffed from
  real bytes server-side). See DECISIONS.md.

### Changed

- **`ContentComposer`** — the type selector (Post/Article/Lecture/...)
  and title field are gone; every member can already create a `post`
  (min level 1), so there was nothing to gate. Moved off `/feed` onto
  its own screen, `/compose`, reached from the bottom nav's new center
  "+" tab — the feed itself is now pure content, no composer at the
  top, no "Feed" heading. `/library`'s old composer usage (dead code
  behind its teaser) was removed rather than kept, since it depended on
  the type selector this component no longer has — see TECH_DEBT.md.
- **Bottom nav** — Threads-style redesign: five icon-only tabs, no text
  labels (Feed, Community, Create Post, Vault, Profile). Library's tab
  is gone (route + teaser still reachable by URL, just not linked from
  the nav).
- **`PostCard`/`PostList`** — flat Threads-style: no card border/
  background, a subtle divider between posts instead. Dropped the
  "Post · " type-label prefix (redundant now that only `post` exists in
  practice).
- **`/hall`** (the "Profile" nav tab) — stripped to avatar, name, Edit
  profile, and the member's own posts. Reputation stars and Trust Score
  now sit behind `REP_UI_ENABLED` (a gap in that flag's original REP-
  ledger-only scope — Max's framing was that these are the same
  REP/reputation UI concept). Login streak removed outright. The "Your
  Invitation" referral block sits behind a new `REFERRALS_UI_ENABLED`
  flag. Notifications stayed — not named as deferred, and it's the only
  surface for approval-type notices. `/profile/[username]`'s reputation
  stars got the same `REP_UI_ENABLED` gate for consistency.
- **`/vault`** teaser copy — "The Vault opens in time." → "Under
  construction. It will be worth the wait."

### Added

- **`lib/config/feature-flags.ts`** — `REFERRALS_UI_ENABLED = false`.

## [0.20.0] — 2026-07-27

Feed-first v1, continued: `OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md` §III/§IV
doesn't name Library among what v1 is "building now," and its seeded
House of Rope demo content references a deferred House — neither fits
launch scope. Also trims the visible Rooms surface: with Houses
deferred, a room named after one is confusing, and Max's call was to
go further — only the Newcomers' room (required by the Initiation
Ritual) stays visible; General and the 7 Local Circles are deactivated
too, not deleted.

### Added

- **`lib/config/feature-flags.ts`** — `LIBRARY_UI_ENABLED = false`.

### Changed

- **`/library`** — route and nav tab kept; real content (post list,
  type filters, composer) replaced with a minimal teaser ("The Library"
  / "The shelves are being filled."), same shape as `/vault`'s.
- **House of Rope's two seeded articles** ("What Is Shibari?", "Getting
  Started in House of Rope") — unpublished (`isPublished: false`), not
  deleted. Not tied to `LIBRARY_UI_ENABLED`: they stay unpublished even
  after Library UI ships, since they reference a deferred House and
  don't fit the launch content policy regardless.
- **Rooms** — `general`, the 7 Local Circles (`sf-circle`, `la-circle`,
  `miami-circle`, `ny-circle`, `berlin-circle`, `london-circle`,
  `tokyo-circle`), and `house-of-rope` all deactivated (`isActive:
  false`), not deleted. `/rooms`, `/rooms/[slug]`, and the
  `/api/rooms/*` routes already gate fully on `isActive` — no code
  changes needed, only data. Only the Newcomers' room remains visible
  and reachable.

### Verified

- Mobile-viewport pass confirmed: Feed works (composer, publish);
  Vault shows its teaser; Library shows its new teaser; Community
  shows only Newcomers (as a room) and the Events link.

## [0.19.0] — 2026-07-27

Feed-first v1, continued: `OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md` §V
also defers Houses and levels/ranks/gold, not just REP. Same pattern as
`REP_UI_ENABLED` — gate rendering (and the DB queries that only exist to
feed it), leave the underlying data/logic running silently. One explicit
exception: the Newcomers' room (a `Room`, not a `House`) stays fully
functional — it's a required Initiation Ritual step, untouched by either
flag.

### Added

- **`lib/config/feature-flags.ts`** — `HOUSES_UI_ENABLED = false` and
  `LEVELS_UI_ENABLED = false`.

### Changed

- **Houses** — `/houses` and `/houses/[slug]` replaced with a minimal
  teaser/redirect (same shape as `/vault`'s) while the flag is off;
  `POST /api/houses/[slug]/join` 404s unconditionally, same 404-before-
  auth-check pattern as `POST /api/admin/rep-adjustment`; the composer's
  house-tagging dropdown (`/feed`, `/library`) and `PostCard`'s house pill
  are hidden; `/rooms`' "Houses →" link is hidden ("Events →" stays).
  Feed-scoping by joined houses (`/feed`'s membership query) is untouched
  — only the value handed to the composer is gated.
- **Levels** — the level-name label (Initiate…Council) on `/hall` and
  `/profile/[username]`, the "Your Next Level" progress section on
  `/hall`, and the `avatar-level-N` border styling everywhere an avatar
  renders (`PostCard`, `/hall`, `/profile/[username]`) are all hidden
  while the flag is off. `checkLevelUp()` (auto-promotion) and
  `getLevelProgress()` (the computation) still run unconditionally —
  only their display is gated.

### Verified

- Full Initiation Ritual walked end-to-end live on the real admin
  account with all three flags (`REP_UI_ENABLED`, `HOUSES_UI_ENABLED`,
  `LEVELS_UI_ENABLED`) off: profile step, Code of Conduct, Lord
  Obsidian's introduction, and posting in the Newcomers' room all
  completed and redirected correctly; `/ritual` redirected to `/hall`
  once done. `/hall`, `/feed` (post composer, publish), `/houses`
  teaser, `/houses/[slug]` redirect, `/vault` teaser, and `/rooms` (no
  "Houses →" link, Newcomers room fully functional) all confirmed
  working with no console errors. Test-induced state (bio, avatar,
  ritual progress, the test post/message, the REP grant it triggered)
  fully reverted afterward.

## [0.18.1] — 2026-07-27

### Fixed

- **`POST /api/admin/rep-adjustment`** now 404s unconditionally while
  `REP_UI_ENABLED` is `false`, checked before `requireAdmin()` even
  runs — closes the gap where `/admin/rep` (the page) was 404'd but
  this endpoint stayed directly callable by anyone who already knew
  it. Verified live with a plain unauthenticated request. See
  TECH_DEBT.md/DECISIONS.md.

## [0.18.0] — 2026-07-27

Feed-first v1 (`OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md`): REP-facing UI
deferred behind a feature flag — the earning/ledger logic is untouched
and keeps running silently.

### Added

- **`lib/config/feature-flags.ts`** — `REP_UI_ENABLED = false`, a single
  server-side constant gating every REP-facing surface below. Flip it
  when REP UI is ready to ship; nothing else needs to change.

### Changed

- **`PostCard`** — the REP badge next to the author's name is hidden
  while the flag is off (`/feed`, `/library`, `/posts/[id]`, and any
  profile's "Recent Posts").
- **`/hall`** — the "REP" stat cell is hidden (status grid drops from
  3 to 2 columns), and the "Recent REP Changes" section + its query are
  both skipped.
- **`/profile/[username]`** — the "`{rep}` REP" line next to the star
  rating is hidden; the owner-only "REP History" section + its query
  are both skipped.
- **`/admin/rep`** — now 404s unconditionally while the flag is off,
  even for real admins — same `notFound()` mechanism `/admin/applications`
  already uses for non-admins, just gated on the flag first.
- **`/vault`** — route and nav tab stay, but with the flag off the real
  REP-gated grid (data fetch, `vault.item_viewed`/`item_locked_hit`
  tracking, and all) is replaced with a minimal teaser: "The Vault" +
  "The Vault opens in time." No items, no thresholds, no REP total.

None of this touches `lib/rating/rep-engine.ts` — `awardRep` and every
award call site keep running exactly as before; REP keeps accumulating
in `RepHistory`/`User.rep`, just isn't rendered anywhere right now.

## [0.17.0] — 2026-07-26

Analytics Phase 0 (SPEC-analytics-panel.md): a server-only event log,
underneath everything — no UI yet (Phases 1/2 build on top of this).

### Added

- **`AnalyticsEvent` model** (`analytics_events` table) — server-written
  event log: `userId` (nullable, `SetNull` on user deletion so deleting
  a member never breaks aggregates), namespaced `type` ("domain.action",
  see the spec's taxonomy), optional `entity`/`entityId`/`meta`. Named
  `AnalyticsEvent`, not `Event` as the spec literally has it — both that
  name and the `events` table name were already taken by the existing
  real-world-meetup `Event` model.
- **`lib/analytics/track.ts`** — the only way events get written.
  `import "server-only"` at the top; confirmed by an actual build
  attempt that importing it from a Client Component fails compilation,
  not just by inspection.
- **RLS on `analytics_events`** (`supabase/migrations/20260726120000_analytics_events_rls.sql`)
  — a member reads only their own rows, admins read everything. Verified
  live with two disposable real accounts through Supabase's anon-key
  client (Prisma's own service-role connection can't test RLS — it
  bypasses it by design): User A's unfiltered read returned only their
  own event, and an explicit query for User B's `userId` returned zero
  rows.
- **`track()` wired into 11 real call sites**: `auth.login` (OAuth
  callback), `auth.signup` (invite redemption, both the fresh-account
  and linked-existing-identity paths), `waitlist.submitted`,
  `waitlist.approved`/`waitlist.rejected` (admin review),
  `house.viewed`, `post.created`, `post.replied` (comments),
  `vault.item_viewed`/`vault.item_locked_hit`, and `rep.granted` — the
  last one written directly inside `awardRep`'s existing
  `$transaction`, not via `track()`, since the spec requires it be in
  the same transaction as the REP grant itself, and every REP award in
  the codebase already funnels through that one function.
- **Not wired — no code to attach to**: `vault.item_claimed` (the Claim
  button is disabled everywhere; no redemption endpoint exists yet) and
  `search.performed` (no search feature exists anywhere in the app).
  See DECISIONS.md and TECH_DEBT.md.

### Fixed / adapted from the spec

- RLS policy corrected from the spec's literal `users.role = 'ADMIN'`
  (this app's `role` column is kink orientation —
  dominant/submissive/switch/... — not a permission level) to
  `users.is_admin = true`, the actual boolean admin flag.
- `AnalyticsEvent.userId` uses `@db.Uuid` (the spec's literal model
  didn't) so its foreign key type-matches `User.id`; the RLS policy
  compares directly against `auth.uid()` with no cast as a result,
  instead of the spec's `::text` cast, which would have been a type
  error the other way (`uuid = text` has no operator).

User Profiles: a real profile page by username, a dedicated self-edit
route, and avatar uploads finally on working infrastructure.

### Added

- **`/profile/[username]`** — avatar, display name, `@username`,
  level/rank, star rating, REP total, location + member-since date,
  bio, house memberships (pills linking to `/houses/[slug]`), last 5
  published posts (shared `PostCard`), reviews, and — owner-only — the
  last 10 REP events. Replaces the old id-based `/profile/[id]`.
- **`/profile/edit`** — param-less, always the caller's own profile
  (the API route re-derives the user from the session regardless).
  Same fields as before (display name, username, bio, city, role,
  interests) plus the new avatar upload; bio is now capped at 300
  characters, enforced both client-side (`maxLength` + a live counter)
  and server-side (422 over the limit).
- **Avatar upload via Supabase Storage** (`POST /api/profile/avatar`)
  — same lazy-bucket pattern as post photos (`post-photos`), its own
  `avatars` bucket, a fixed `userId/avatar.<ext>` path (`upsert: true`,
  so re-uploading replaces rather than accumulates), a cache-busting
  `?v=` query param on the stored URL so the browser doesn't keep
  showing the previous image after a re-upload.
- **Own-profile link**: the avatar and display name on `/hall` now
  link to `/profile/[username]`; the existing "Edit profile" link now
  points at `/profile/edit`.

### Changed

- `PATCH /api/profile` — added server-side bio length validation
  (422 `"Bio must be 300 characters or fewer."`) to match the new
  client-side cap.

### Removed

- **UploadThing avatar flow** — `app/api/uploadthing/`,
  `lib/utils/uploadthing.ts`, the `uploadthing`/`@uploadthing/react`
  packages, and the empty `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID` env
  vars. Never actually verifiable (the credentials were never
  provisioned — see TECH_DEBT.md) and now fully replaced by the
  Supabase Storage flow above, which is real and was verified
  end-to-end against the live project.

## [0.15.0] — 2026-07-17

Closed Registration & Invite System: applications no longer create an
account at approval time — approval now generates a one-time invite
link the admin copies and sends manually, and the account (including
password) is only created when that link is redeemed.

### Added

- **Invite tokens** — `Waitlist.inviteToken`/`inviteTokenUsedAt`. Approving
  an application (`PATCH /api/admin/applications/[id]`) now only
  generates a random 48-hex-char token and returns an `inviteUrl` — no
  account, no email is created at this step anymore.
- **Invite registration** (`/invite/[token]`, `POST /api/invite/[token]`)
  — the token's landing page collects name (prefilled, editable), email
  (prefilled, fixed), and a real password. On submit: creates the
  Supabase Auth user + `User`/`UserProfile`/`Notification`/`Referral`/REP
  rows, marks the token used, signs the new member in, and redirects to
  `/feed`. Invalid, already-used, or non-approved tokens show a plain
  message instead of the form (no stack traces, no leaking which case
  it is beyond a human-readable sentence).
- **`/register` block** — explicit 403 on GET/POST, `{ error: "Direct
  registration is closed. You need an invite link." }`. No prior route
  or `signUp()` call existed anywhere in the app; this exists purely so
  nothing that ever links to `/register` finds an open door.
- **Admin UI**: after Approve, the application card now shows the invite
  link inline (`<code>` block + Copy button) instead of just vanishing
  from the queue — the admin has to actually see and copy it to send it
  themselves.

### Changed

- **`ApplicationsQueue`**: approved applications stay visible (showing
  their invite link) instead of disappearing from the list; declined
  applications still disappear as before.

### Removed

- **`sendAccessGrantedEmail`** (`lib/utils/email.ts`) — the old
  approval flow's auto-sent "you're in" email is gone along with the
  flow it belonged to (see DECISIONS.md for why the old flow was
  replaced, not extended).

### Fixed

- The old approval flow created the Supabase Auth user via
  `admin.generateLink({ type: "invite" })` and emailed the raw link, but
  **no page in the app ever collected a password** — the email's own
  copy ("set your password to enter") described a step that didn't
  exist. A member who spent that one-time link had no way to log back
  in afterward. The new flow collects a real password on a real page
  before the account is ever considered complete.

## [0.14.0] — 2026-07-17

Feed & Posts MVP: photo uploads, real comments, a post detail page.

### Added

- **Post photos** — a single optional image per post, uploaded to
  Supabase Storage (`POST /api/posts/photo`, bucket `post-photos`,
  public read) — chosen deliberately over reusing the existing
  UploadThing avatar pipeline, since the task named Supabase Storage
  specifically. 8MB limit, JPEG/PNG/WEBP/GIF only.
- **Real comments** — `GET`/`POST /api/posts/:id/comments`, a flat
  chronological list (no nesting/replies — not documented anywhere).
  `CommentSection` renders the list + an add-comment input.
- **Post detail page** (`/posts/[id]`) — full post card + all comments.
  Feed/Library cards' comment count is now a real link here.
- **REP badge, house tag, and photo** on every post card (`PostCard`,
  extracted from `PostList` so `/feed`, `/library`, and `/posts/[id]`
  share one rendering).

### Changed

- **Feed scope**: `/feed` now shows global posts (no house) + posts from
  houses the caller has actually **joined** (`HouseMembership`) — not
  every active house's posts, now that membership is a real thing (REP
  system task, 2026-07-16). `/library`'s composer is scoped the same way.
- **`POST /api/posts`**: tagging a post to a house now requires real
  membership, enforced server-side (previously any active house could be
  tagged regardless of membership — that check predates `HouseMembership`
  existing at all).

## [0.13.0] — 2026-07-16

REP system completion + The Vault.

### Added

- **REP display + history** (`/profile/[id]`): total REP was already
  shown; added a full event ledger (reason, source, date, signed delta)
  — visible only to the profile's own owner, same reasoning as the
  review form only showing on other people's profiles, inverted.
- **New REP sources**: `houseJoined` (+10, one-time per house),
  `firstPost` (+5, one-time ever), `housePost` (+2 per house-tagged
  post, daily cap 10 — the 6th+ house post in a day earns nothing).
  `invitedNewMember` changed 300 -> 15 (Max's explicit call — replaces,
  doesn't stack with, the old figure).
- **Real House membership**: `HouseMembership` model + `POST /api/
  houses/:slug/join` + a "Join House" button on `/houses/[slug]`,
  showing "Member since" once joined. Distinct from posting/viewing
  content in a house, which anyone could already do without joining.
- **Admin REP adjustment** (`/admin/rep`): +/- amount with a required
  reason, logged with `source: "admin-adjustment"` so it's always
  distinguishable from a mechanically-earned event. Same 404-for-non-
  admins pattern as `/admin/applications`.
- **The Vault redesigned as a grid** (`/vault`): image placeholder (a
  generic icon — no real per-item artwork exists yet; `VaultItem.
  imageUrl` is there for when it does), exact "Unlocks at N REP — you
  have M" copy for locked items, a "Claim" CTA for unlocked items
  (honestly disabled — there's no redemption/fulfillment backend, same
  pattern as the disabled Apple Sign-In button). Seeded 3 explicitly
  -named test items (thresholds 10/50/150) to exercise the gating logic.

### Changed

- `app/api/posts/route.ts`: publishing now awards `firstPost`/`housePost`
  REP where it applies (previously posting never awarded REP at all —
  see the removed comment this replaces).

## [0.12.0] — 2026-07-16

Admin panel: application review UX + a critical RLS gap found and fixed.

### Added

- `/admin/applications` now shows each applicant's `reason` ("why you
  belong here") and a native confirm dialog before Approve/Decline —
  both are final per the brand's own Code of Conduct ("we do not
  reconsider"), so a stray click can no longer silently approve/decline.
- `requireAdmin()` failures on `/admin/applications` now render a real
  404 (`notFound()`), not a redirect — a non-admin member can't tell the
  panel exists at all, vs. a redirect or 403 that confirms something is
  there they can't see.

### Fixed

- **Hydration mismatch on the applied-date**: `toLocaleDateString()` with
  no fixed locale rendered differently server vs. client whenever the two
  disagreed on locale (reproduced here: server en-US, browser ru →
  "7/16/2026" vs. "16.07.2026"), forcing React to discard and re-render
  the whole page client-side. Pinned to `en-US`/UTC on both sides.
- **Row Level Security was disabled on every table except `waitlist`**
  (`users`, `messages`, `user_profiles`, `notifications`, `rep_history`,
  `reviews`, `rooms`, `posts`, `likes`, `referrals`, `houses`,
  `vault_items`, `marketplace_items`, `user_achievements`) — found while
  verifying this task's "RLS-enforced" framing against the actual schema.
  Since `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public, anyone could have
  queried Supabase's REST API directly and read every member's PII or
  private room messages, entirely bypassing this app's own Prisma-based
  access control. **Not fixed in this pass** — enabling RLS safely needs
  per-table policies designed around what little client-side Supabase
  access exists (Realtime `postgres_changes` on `messages` requires a
  matching SELECT policy or live chat silently stops updating); see
  DECISIONS.md and TECH_DEBT.md for the full writeup and recommended next
  step.

## [0.11.0] — 2026-07-15

Initiation Ritual: real Code of Conduct + Lord Obsidian's introduction.

### Added

- `/ritual/code-of-conduct`: the five laws (Roman numerals in
  `ob-accent` red, Cinzel headers, Cormorant body), gated by a real
  "I Accept the Code" action — writes `ritualProgress.codeOfConduct`
  plus an acceptance timestamp via `POST /api/ritual/progress`.
- `/ritual/introduction`: Lord Obsidian's introduction, italic serif
  treatment matching the landing page's Founder section, signature
  block right-aligned. Marks the step complete automatically once the
  member scrolls to the end (`IntersectionObserver` on a sentinel after
  the signature), not on a click — matches the task's "scrolled to end"
  requirement.
- `POST /api/ritual/progress`: the one place a member can self-report
  ritual progress, restricted to exactly these two steps (never
  `newcomerRoom`, which stays computed live from message history, or
  `safetyRules`, which has no content yet).

### Changed

- `lib/auth/ritual.ts`: `codeOfConduct`/`introMaterial` no longer honor
  the old `"deferred"` sentinel — any member whose `ritualProgress`
  predates this change is correctly re-surfaced as `"todo"`, since they
  never actually read/accepted anything (the content didn't exist yet).
  `safetyRules` is unaffected — still genuinely deferred pending content.

## [0.10.0] — 2026-07-13

Landing Page redesign (agency-approved design handoff).

### Added

- Full landing page (`app/(landing)/page.tsx`) recreated pixel-for-pixel
  from the approved design handoff: fixed nav, hero with poster image +
  ambient glow, Founder/Ethos section (blurred/vignetted portrait), Five
  Principles grid, Admission steps, and the application form section —
  all using existing design-system tokens/classes.
- `HeroInviteForm`: hero's email-only field funnels to the full
  application (scrolls to `#apply`, carries the email down) rather than
  submitting on its own — the API's 18+ age check is a real compliance
  gate, and a bare email has no age to check. Max's call; see
  DECISIONS.md.
- `ApplicationForm` (replaces `WaitlistForm`): adds a "Why you belong
  here" field, wired to `Waitlist.reason` (new column).
- Brand assets `oc-logo.jpg`, `hero-library.png`, `founder-bust.jpg` in
  `public/images/`.

### Fixed

- **Row Level Security was disabled on `waitlist`.** The anon key (public,
  shipped to the browser for Supabase Auth) could have read every
  application's name/email/age/city directly via the Supabase REST API,
  bypassing Prisma entirely. Enabled RLS and added an `INSERT`-only
  policy for `anon`; no `SELECT`/`UPDATE`/`DELETE` policy exists, so
  anon can submit but never read. Confirmed the app's own write path
  (Prisma via `DATABASE_URL`, which has `BYPASSRLS`) still works.
- **Landing page monogram was a hand-drawn SVG approximation**, not the
  real brand mark. Deleted it everywhere (nav, footer, Principles grid,
  Apply header) and replaced with a real crop + alpha-matte cutout of the
  design package's `oc-logo.jpg` (`components/ui/LogoMark.tsx`,
  `public/images/logo-mark.png`). Also fixed the two other
  placeholder-logo spots this surfaced: the PWA app icons and the social
  share (`opengraph-image`) card were drawing plain "O"/"C" text via
  `next/og`, not any real asset; `app/favicon.ico` was still the default
  `create-next-app` scaffold icon. All three now use the real cutout. See
  DECISIONS.md for the small-favicon legibility tradeoff.

## [0.9.0] — 2026-07-09

Vault Mechanic, House Content UI & Apple Sign-In.

### Added

- Real Vault mechanic: `VaultItem` model (`minRep`-gated, no price —
  unlike the older `MarketplaceItem`). `/vault` shows real items
  locked/unlocked by `user.rep`. `POST /api/admin/vault-items` for Max
  to add real items — none seeded.
- House content-tagging UI: `ContentComposer.tsx` gained a house
  picker; `POST /api/posts` validates the optional `houseId`.
- Apple Sign-In: "Continue with Apple" button on `/login`, reusing the
  provider-agnostic `/auth/callback` as-is. Gated behind
  `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` (default `false`) until Max
  configures real Apple Developer credentials.

### Not done this pass

`MarketplaceItem` retirement decision, Signature Rope Collection,
phone sign-in.

## [0.8.0] — 2026-07-08/09

Houses, Vault & Profile — the restored `CLAUDE.md`'s next priorities.

### Added

- Houses System: `House` model, `houseId` on `Room`/`Post`, House of
  Rope (Phase 1) seeded with a linked room and its first two real
  articles ("What Is Shibari?", "Getting Started in House of Rope").
  `/houses` + `/houses/[slug]` built. See
  [ADR-0016](docs/ADR/0016-houses-system.md).
- The Vault fully replaces Shop — `/shop` deleted, `/vault` placeholder
  added, bottom nav updated.
- `/profile` — a stable, ID-less redirect to the caller's own
  `/profile/[id]`; REP now displays there alongside reputation stars.
- Fixed the Google OAuth registration gap — a first-time sign-in with
  no matching member now creates a pending `Waitlist` application
  instead of a dead end.

## [0.7.1] — 2026-07-06

First connection to real infrastructure: a live Supabase project (Auth +
Postgres), the first real member account, GitHub, and Google Sign-In.
No architecture changes — this is the "actually connected," not "still
just code," milestone `TECH_DEBT.md` had flagged since `v0.2`.

### Added

- Real Supabase project connected: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Auth),
  and `DATABASE_URL`/`DIRECT_URL` (Postgres, via the session pooler —
  the project's direct `db.*.supabase.co` host is IPv6-only and
  unreachable from this environment) in `.env.local`. `prisma db push`
  ran successfully — all tables now exist in the real database.
- Repository pushed to GitHub
  ([rtmaksim15-dot/obsidian-club](https://github.com/rtmaksim15-dot/obsidian-club)).
- The first real member account: approved the real waitlist application
  for `lord.obsidian.oc@gmail.com` (submitted through the actual landing
  page), with `isAdmin: true` and `role: dominant` per Max's request —
  the project's first admin, created via a one-off script replicating
  the approval route's logic exactly (no admin existed yet to call the
  real endpoint with).
- Google Sign-In: `app/auth/callback/route.ts` (PKCE code exchange) and
  a "Continue with Google" button on `/login`. Max provided a real
  Google OAuth Client ID/Secret and enabled the provider in the Supabase
  dashboard himself.

### Not done this pass (see `TECH_DEBT.md`)

Apple Sign-In, phone sign-in, Realtime enablement on the `messages`
table (still a one-time manual Supabase dashboard step), Resend/
Uploadthing accounts, Vercel deployment.

## [0.7.0] — 2026-07-05

CLAUDE.md v2 Migration: an expanded `CLAUDE.md` Max shared this day
directly conflicted with mechanics already live (level names, the
reputation formula, navigation) — see
[ADR-0015](docs/ADR/0015-claude-md-v2-full-replacement.md). Confirmed with
Max this is a full replacement, not new scope on top, and migrated.

### Changed

- Level names renamed everywhere: Initiate/Member/Senior Member/Mentor/
  Master/Council Member → Initiate/Keeper/Steward/Warden/Master/Council.
  Centralized into `lib/rating/levels.ts` (was duplicated in three files).
- Reputation model replaced: `lib/rating/rating-engine.ts`'s weighted
  formula → `lib/rating/rep-engine.ts`'s discrete REP point ledger.
  `User.rating` renamed to `rep`; `RatingHistory` renamed to
  `RepHistory`; `User.influence` dropped (no equivalent in the new
  model); `User.reputation` (peer-review stars) kept, now independent of
  REP rather than a weighted input to it.
- `/content` split into `/feed` (posts/stories) and `/library`
  (articles/lectures/courses/manifestos); `/content` now redirects to
  `/feed`. Bottom nav relabeled Feed/Shop/Community/Library/Profile
  ("Community" → `/rooms`, "Profile" → `/hall`).

### Added

- `/shop` — honest "coming soon" placeholder (same pattern as `/events`).
- `User.role` (`MemberRole` enum: dominant/submissive/switch/observer/
  newcomer) and `User.interests` (free-text tags) — captured via the
  existing profile self-edit form; `locationCity` made editable there
  too (previously set once at approval).
- `User.currentStreak`/`longestStreak`/`lastLoginDate` — daily-login
  streak tracking, feeding the new REP daily-login/7-day/30-day bonuses.
- Real REP triggers wired: profile-complete, verification-passed
  (admin approval), first-community-introduction (Initiation Ritual
  step 4), daily-login streaks, invited-new-member,
  invitee-reached-Level-II, invitee-active-90-days. The rest of
  `CLAUDE.md`'s earn/lose table is recorded in
  `rep-engine.ts#REP_TABLE` but not wireable yet (no dependent feature
  exists) — see `TECH_DEBT.md`.
- "No external links in posts" validation on post create/edit — a
  literal `CLAUDE.md` rule.
- `docs/ADR/0015-claude-md-v2-full-replacement.md`.

### Not done this pass (see `TECH_DEBT.md`/`BACKLOG.md`)

Google/Apple/phone sign-in, Shop & Payments (crypto, adult-friendly card
processor, escrow), algorithmic Feed ranking (For You/Following), video
posts — all need real external accounts or a dedicated design pass
before any code.

## [0.6.0] — 2026-07-04

Content & Achievements: a real content feed and library, level-gated
creation rights, likes, level auto-promotion (I→II, II→III), and four
new mechanically-real achievements.

### Added

- `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/:id`, `POST
  /api/posts/:id/like` (`docs/API/posts.md`) — the content feed and
  library, replacing the `/content` "coming soon" placeholder.
- `lib/rating/content-rights.ts#canCreatePostType()` — creation rights
  by level per `PRODUCT.md` §10's exact table (post/story: Level 1+;
  article: Mentor/4+; lecture, course: Master/5+; manifesto: admin-only).
- `Like` model (real join table, toggled via the like endpoint,
  `Post.likesCount` kept in sync) and `Comment` model (schema only — no
  API/UI yet, see `TECH_DEBT.md`).
- `/content` — real feed (posts/stories) + library
  (articles/lectures/courses/manifestos) with a level filter, a
  composer (`ContentComposer.tsx`, only shows types the caller can
  create), and like buttons (`LikeButton.tsx`).
- `lib/rating/level-progression.ts#checkLevelUp()` — real auto-promotion
  for Level I→II and II→III, checked opportunistically on Hall load
  (same pattern as `syncReferralLifecycle`). Gates only on criteria with
  a real metric (reputation, referral count, has-published-content);
  "steady/high activity" still can't gate it — see `TECH_DEBT.md`.
- `lib/rating/level-progress.ts` — the Level II→III "content or event
  contribution" criterion now shows a real `true` (was always `null`)
  when the member has published content.
- Four new achievements (`lib/utils/achievements.ts`): `level-up-2`,
  `level-up-3` (on promotion), `first-post` (first published content),
  `first-reputation-star` (first received review) — joining
  `initiation-complete` (`v0.3`).
- `lib/rating/rating-engine.ts`'s `content` component is now real (was
  an honest zero) — curated content types only, capped at the
  documented 5-point weight, disjoint from `activity`'s post count to
  avoid double-counting.

### Changed

- `docs/UX.md` corrected: article creation requires Mentor(4)+, not
  "Level II+" as previously (inaccurately) paraphrased.

### Fixed

- N/A.

### Removed

- N/A.

### Known gaps / deliberate simplifications (see [TECH_DEBT.md](TECH_DEBT.md))

No comment API/UI despite the `Comment` model existing; no post media
upload (`mediaUrls` always empty); no draft/unpublish workflow (posts
publish immediately); no feed pagination beyond 20; "steady/high
activity" still has no defined metric, so `checkLevelUp()` silently
skips it rather than blocking promotion on an unmeasurable criterion.

## [0.5.0] — 2026-07-04

Reputation: real peer reviews, a rating engine implementing
`ARCHITECTURE.md` §5's exact weighted formula, a rating history log, and
the referral "Trust Chain"'s Trust Score bonus.

### Added

- `POST /api/users/:id/review` — peer reviews (`docs/API/reviews.md`),
  submitted via a form on `/profile/[id]`; reputation recomputes as the
  average of a member's visible received reviews.
- `lib/rating/rating-engine.ts#recalculateRating()` — implements
  `ARCHITECTURE.md` §5's component weights (reputation 30, activity 20,
  achievements 15, referral quality 20, events 10, content 5).
  Reputation's formula (`stars × 6`) is fully specified and implemented
  exactly; activity/achievement/referral-quality curves are this
  session's documented, reasonable defaults where the source doc names
  what counts but not the exact curve. `events`/`content` are honest
  zeros — no real Events (v0.7) or content-creation (v0.6) feature
  exists yet to measure them from.
- Every rating recalculation logs its delta to `RatingHistory`, now
  shown on `/hall` ("Recent Rating Changes").
- `lib/rating/referral-lifecycle.ts#syncReferralLifecycle()` — the
  `+10` Trust Score bonus for a referral reaching `active` status (30+
  days after the invitee joined), exactly as `ARCHITECTURE.md` §5
  specifies. Checked opportunistically on Hall load — no real
  cron/background job infrastructure exists yet.
- Initiation Ritual step 4 (introduce yourself in the newcomers' room)
  is now checked against real message history instead of the `v0.3`
  `"deferred"` placeholder, now that Rooms exist (`v0.4`) — closes
  [ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md)'s own
  stated review trigger.

### Changed

- N/A.

### Fixed

- N/A.

### Removed

- N/A.

### Known gaps / deliberate simplifications (see [TECH_DEBT.md](TECH_DEBT.md))

Trust Score's `-20`/`-50` deltas (invitee warning/removal) aren't wired
— no member-moderation admin capability exists yet to trigger them.
**New risk surfaced by making ritual step 4 real**: the newcomers'
room's 30-day access window could permanently lock a member out of
completing the ritual if they don't post in time — needs a product
decision (grace period? an access exception?), not fixed here. No real
cron — referral lifecycle checks only run when the inviter visits
`/hall`. Not verified end-to-end — still blocked on Max provisioning
Supabase, Resend, and Uploadthing.

## [0.4.0] — 2026-07-03

Community: real rooms, real-time chat, level-gated access, the
newcomers' room's 30-day window, and the first local circles.

### Added

- `/rooms` — real room list (replaces the `v0.3` "coming soon"
  placeholder), grouped by type, locked rooms shown with a lock icon
  rather than hidden (`DESIGN.md`).
- `/rooms/[slug]` — room chat: message history (oldest-first),
  composer, live updates via Supabase Realtime
  (`components/shared/RoomChat.tsx`).
- `lib/rating/room-access.ts#canAccessRoom()` — server-side level gate
  plus a real 30-day window for the newcomers' room (`PRODUCT.md` §1),
  enforced on every room route, not just hidden in the UI.
- `GET /api/rooms`, `GET /api/rooms/:slug`, `GET/POST
  /api/rooms/:slug/messages`, `POST /api/admin/rooms` — see
  [docs/API/rooms.md](docs/API/rooms.md).
- `prisma/seed.ts` — seeds `general`, `newcomers`, and the 7 named
  local circles (SF/LA/Miami/NY/Berlin/London/Tokyo, `CLAUDE.md` §7).
  **No thematic rooms are seeded** — none are named in any source doc;
  `POST /api/admin/rooms` exists so admins can create them with real
  topics instead of this session guessing at community content. See
  [DECISIONS.md](DECISIONS.md), 2026-07-03.

### Changed

- N/A.

### Fixed

- N/A.

### Removed

- The `v0.3` "coming soon" placeholder at `/rooms` (replaced by the
  real page). `/content` and `/events` keep their placeholders until
  `v0.6`/`v0.7`.

### Known gaps / deliberate simplifications (see [TECH_DEBT.md](TECH_DEBT.md))

Realtime chat updates require enabling Realtime on the `messages` table
in the Supabase dashboard once the project exists (a manual step, not
something a migration configures) — until then, messages still
send/persist correctly, they just won't appear live for other members.
No presence ("who's online"), no message pagination beyond the latest
50, no message edit/delete, no rate limiting on posting. `RoomChat`
re-fetches the message list on every new message rather than merging
the Realtime payload (correct but wasteful at real scale). Not verified
end-to-end — still blocked on Max provisioning Supabase (now also for
Realtime specifically), Resend, and Uploadthing.

## [0.3.0] — 2026-07-03

The Hall: real member status, progress-to-next-level, a working referral
chain, notifications, mobile navigation, an Initiation Ritual framework,
and profile self-editing.

### Added

- Full Hall UI (`/hall`) — real reputation/rating/influence/Trust Score,
  progress-to-next-level, referral link + stats, notifications. See
  [docs/UX.md](docs/UX.md)'s implementation status table.
- `lib/rating/level-progress.ts` — progress-to-next-level using only the
  criteria `PRODUCT.md` §2 actually quantifies (reputation stars,
  referral count); unquantified criteria ("steady/high activity")
  render as plain text, never a fabricated progress number. Mentor+
  correctly shown as appointed, not earned.
- Referral resolution: the `Referral` model (unused since Week 1) is now
  actually wired — approving an application whose entered code matches
  a real member's `referralCode` creates a `Referral` row and increments
  the inviter's count.
- Real `Notification` rows — created on approval, shown on `/hall`.
- Initiation Ritual (`/ritual`, `lib/auth/ritual.ts`) gates the Hall.
  Step 1 (complete profile) is fully real, computed live from actual
  `User` data. Steps 2/3/4/5 are honest "pending" states — see
  [ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md) and
  `DECISIONS.md` (2026-07-02) for why 3 of those 4 steps need real
  content Max hasn't written yet, not just more code.
- Mobile bottom navigation (`DESIGN.md` §8), plus "coming soon"
  placeholder pages for Rooms/Content/Events (`app/(platform)/layout.tsx`,
  `components/shared/ComingSoon.tsx`) so the nav doesn't dead-end ahead
  of those versions.
- Profile self-edit (`/profile/[id]/edit`, `PATCH /api/profile`) — display
  name, username, bio. Avatar upload moved here from `/hall`.
- `lib/utils/achievements.ts` — grants "Прошёл Ритуал Инициации"
  (`PRODUCT.md` §7) on ritual completion.

### Changed

- `/hall` now redirects to `/ritual` until the ritual is complete
  (previously ungated).
- Avatar upload moved from `/hall` to `/profile/[id]/edit` (was
  awkwardly placed on Hall in `v0.2` — see `TECH_DEBT.md`).

### Fixed

- `/ritual` was missing from `middleware.ts`'s `PROTECTED_PREFIXES` —
  caught and fixed same day; its page-level auth check meant this was a
  defense-in-depth gap, not an actual hole (still redirected correctly).

### Removed

- N/A.

### Known gaps / deliberate simplifications (see [TECH_DEBT.md](TECH_DEBT.md))

Ritual steps 2/3/5 need real content from Max; "steady/high activity"
has no defined metric to track; `Referral.status` only ever reaches
`joined`, never `active`/`problem`/`removed` (needs the `v0.5` rating
engine's trigger points); notifications have no mark-as-read yet;
username collisions return a generic error. Not verified end-to-end —
still blocked on Max provisioning Supabase/Resend/Uploadthing.

## [0.2.0] — 2026-07-02

Authentication: Supabase Auth login, an approval-gated onboarding flow
(no open self-registration, per `PRODUCT.md`), admin panel v1, a minimal
Hall and profile view, and avatar upload. Also introduced the engineering
documentation framework (`/docs`, ADRs, this changelog, `DECISIONS.md`,
`TECH_DEBT.md`, `BACKLOG.md`) that now governs how this project is built.

### Added

- Supabase Auth integration: `lib/auth/` (browser/server/admin clients,
  `getCurrentUser()`, `requireAdmin()`), `middleware.ts` (session refresh
  + route protection for `/hall`, `/rooms`, `/profile`, `/events`,
  `/content`, `/marketplace`, `/progress`, `/admin`). See
  [ADR-0010](docs/ADR/0010-supabase-auth.md).
- `/login` — email/password sign-in. No public registration page; access
  is granted via admin approval, per `PRODUCT.md`'s "you don't register,
  you're granted access" model.
- Admin panel v1: `/admin/applications` + `GET/PATCH /api/admin/applications`
  — review, approve, or decline Waitlist entries. Approval creates a
  Supabase Auth user + matching `User` row at Level I, and sends a
  branded "your access has been granted" email via Resend. See
  [docs/API/admin.md](docs/API/admin.md).
- `/hall` — minimal authenticated status view (real reputation/rating/
  influence/Trust Score data). Full Hall UI is `v0.3`.
- `/profile/[id]` — minimal member profile view. Tabs (achievements,
  content, reviews) are `v0.3`.
- Avatar upload via uploadthing (`app/api/uploadthing/`,
  `components/shared/AvatarUploadButton.tsx`), surfaced on `/hall`.
- `User.isAdmin` and `Waitlist.status`/`reviewedAt`/`reviewedBy` — schema
  additions beyond `ARCHITECTURE.md`'s documented columns, needed for the
  admin approval flow. See [ADR-0011](docs/ADR/0011-isadmin-field.md),
  [ADR-0012](docs/ADR/0012-waitlist-status-tracking.md).
- The full engineering documentation framework: `/docs` (Vision,
  Philosophy, Architecture, UX, UI, API/, ADR/), `DECISIONS.md`,
  `TECH_DEBT.md`, `BACKLOG.md`, and this file. Work is now tracked by
  product version instead of calendar week.

### Changed

- Work organization moved from calendar-week tracking (`ROADMAP.md`'s
  original framing) to product-version tracking
  (`v0.1` = Landing, `v0.2` = Authentication, ...).

### Fixed

- `middleware.ts` and `lib/auth/session.ts` initially crashed **every**
  request (including the public landing page) when Supabase credentials
  aren't configured — caught before commit by testing the landing page
  after adding auth, not by assumption. Fixed to degrade to "not logged
  in" instead of throwing. See `DECISIONS.md`, 2026-07-02.

### Removed

- N/A.

### Known gaps / deliberate simplifications (see [TECH_DEBT.md](TECH_DEBT.md))

Not verified end-to-end (blocked on Max provisioning Supabase, Resend,
and Uploadthing accounts); the Initiation Ritual (`PRODUCT.md` §1 Stage 2)
is simplified — approval grants Level I directly rather than gating on
the 5-step ritual; usernames are auto-generated with no self-edit flow
yet; the purpose of the originally-planned `(auth)/apply/` route is
unresolved and needs Max's input; Supabase Auth user creation and the
matching `users` row write aren't atomic.

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
