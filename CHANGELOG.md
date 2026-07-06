# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versioning
follows [Semantic Versioning](https://semver.org/) — see
[docs/README.md](docs/README.md#versioning) for how pre-1.0 versions map
to product milestones (`v0.1` = Landing, `v0.2` = Authentication, etc.).

## [Unreleased]

Nothing yet — `v0.7.1` is the current released version.

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
