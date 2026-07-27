# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versioning
follows [Semantic Versioning](https://semver.org/) — see
[docs/README.md](docs/README.md#versioning) for how pre-1.0 versions map
to product milestones (`v0.1` = Landing, `v0.2` = Authentication, etc.).

## [Unreleased]

Nothing yet — `v0.19.0` is the current released version.

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
