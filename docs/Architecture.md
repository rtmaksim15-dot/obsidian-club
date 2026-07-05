# Architecture (as-built)

> This is the **living, as-built** counterpart to Max's original
> `ARCHITECTURE.md` (iCloud package). Where the two disagree, it's because a
> documented decision (linked below) changed course — never a silent drift.
> If you find a mismatch that ISN'T explained by a linked ADR, that's a
> conflict: stop and flag it (see [docs/README.md](README.md)).

Current version: **v0.7.0** (CLAUDE.md v2 Migration). `package.json`'s
`version` field is the single source of truth for the current version
number. See [ADR-0015](ADR/0015-claude-md-v2-full-replacement.md) for
why `v0.7` renamed levels, replaced the reputation engine, and
restructured navigation mid-stream.

## Stack (as actually installed)

| Layer | Choice | Version | Deviation from spec? |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 | Yes — pinned below "latest". See [ADR-0001](ADR/0001-pin-nextjs-14-tailwind-v3.md) |
| Styling | Tailwind CSS | 3.4.1 | Yes — pinned below "latest". See [ADR-0001](ADR/0001-pin-nextjs-14-tailwind-v3.md) |
| Language | TypeScript | 5.x | No |
| ORM | Prisma | 6.19.3 | Yes — pinned below "latest" (7.x). See [ADR-0002](ADR/0002-pin-prisma-v6.md) |
| DB driver | `@prisma/client` | 6.19.3 | matches Prisma |
| DB (target) | PostgreSQL via Supabase | — | Not yet provisioned, see [TECH_DEBT.md](../TECH_DEBT.md) |
| Auth | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) | 0.12.0 / 2.110.0 | Resolves a real ambiguity across two `ARCHITECTURE.md` sections. See [ADR-0010](ADR/0010-supabase-auth.md) |
| Animation | framer-motion | 12.42.2 | Installed per spec, but **not used** on the public landing page — see [ADR-0003](ADR/0003-remove-framer-motion-from-landing.md) |
| Icons | lucide-react | 1.22.0 | No |
| Email | Resend | 6.16.0 | Installed, not yet connected (no API key) |
| File upload | uploadthing | 7.7.4 | Wired (avatar upload), not yet connected (no keys) |
| Analytics | @vercel/analytics | 2.0.1 | Chosen over Google Analytics — see [ADR-0008](ADR/0008-vercel-analytics-over-ga.md) |
| Hosting (target) | Vercel | — | Not yet deployed, see [TECH_DEBT.md](../TECH_DEBT.md) |

## Folder structure (actual)

```
obsidian-club/
├── middleware.ts                        # session refresh + route protection
├── app/
│   ├── (auth)/
│   │   ├── apply/                       # empty — purpose unclear, see TECH_DEBT.md
│   │   └── login/page.tsx               # Supabase email/password sign-in
│   ├── (landing)/
│   │   ├── page.tsx                     # the public Landing page
│   │   └── opengraph-image.tsx          # generated social share image
│   ├── (platform)/
│   │   ├── layout.tsx                   # bottom nav (DESIGN.md §8), mobile only
│   │   ├── hall/page.tsx                # status, progress, referrals, notifications
│   │   ├── ritual/page.tsx              # Initiation Ritual (v0.3, see ADR-0013)
│   │   ├── profile/[id]/page.tsx        # profile view (no tabs yet)
│   │   ├── profile/[id]/edit/page.tsx   # self-edit only
│   │   ├── admin/applications/page.tsx  # admin panel v1 — approve/decline
│   │   ├── rooms/page.tsx               # real room list ("Community" nav tab), locked rooms shown per DESIGN.md
│   │   ├── rooms/[slug]/page.tsx        # room chat — real-time via Supabase Realtime
│   │   ├── feed/page.tsx                # posts/stories feed (v0.7 — split from /content)
│   │   ├── library/page.tsx             # articles/lectures/courses/manifestos (v0.7 — split from /content)
│   │   ├── content/page.tsx             # redirects to /feed (v0.7, kept for old links)
│   │   ├── shop/page.tsx                # "coming soon" placeholder (v0.7) — Shop & Payments need real accounts, see TECH_DEBT.md
│   │   ├── events/page.tsx              # "coming soon" placeholder (v0.8 builds the real thing), linked from /rooms
│   │   └── marketplace|progress/        # still empty — later versions
│   ├── api/
│   │   ├── waitlist/route.ts
│   │   ├── admin/applications/route.ts, [id]/route.ts
│   │   ├── admin/rooms/route.ts         # admin creates thematic rooms — see docs/API/rooms.md
│   │   ├── profile/route.ts             # self-edit only, see API/profile.md
│   │   ├── rooms/route.ts, [slug]/route.ts, [slug]/messages/route.ts
│   │   ├── posts/route.ts, [id]/route.ts, [id]/like/route.ts  # see API/posts.md
│   │   ├── users/[id]/review/route.ts   # peer reviews, see API/reviews.md
│   │   └── uploadthing/core.ts, route.ts
│   ├── icons/icon-192.png/route.tsx, icon-512.png/route.tsx
│   ├── layout.tsx                       # fonts, metadata, Analytics
│   └── globals.css                      # full DESIGN.md token system
├── components/
│   ├── ui/Logo.tsx                      # OC monogram — real cropped brand image (v0.6, see TECH_DEBT)
│   └── shared/WaitlistForm.tsx, Reveal.tsx, ApplicationsQueue.tsx,
│       AvatarUploadButton.tsx, BottomNav.tsx, ComingSoon.tsx, ProfileEditForm.tsx,
│       RoomChat.tsx, ReviewForm.tsx, ContentComposer.tsx, LikeButton.tsx, PostList.tsx
├── lib/
│   ├── auth/
│   │   ├── supabase-browser.ts          # Client Component Supabase client
│   │   ├── supabase-server.ts           # Server Component / Route Handler client
│   │   ├── supabase-admin.ts            # service-role client — server-only
│   │   ├── session.ts                   # getCurrentUser() — also touches the daily-login REP streak (v0.7)
│   │   ├── require-admin.ts             # requireAdmin()
│   │   └── ritual.ts                    # getRitualStatus() — real, computed, see ADR-0013; awards first-community-intro REP (v0.7)
│   ├── rating/levels.ts                 # LEVEL_NAMES — single source of truth for level display names (v0.7)
│   ├── rating/level-progress.ts         # getLevelProgress() — real criteria only, no fabricated metrics
│   ├── rating/level-progression.ts      # checkLevelUp() — real I→II/II→III auto-promotion (v0.6); awards invitee-Level-II REP to the inviter (v0.7)
│   ├── rating/room-access.ts            # canAccessRoom() — level gate + newcomers' 30-day window
│   ├── rating/content-rights.ts         # canCreatePostType() — PRODUCT.md §10's exact table (v0.6)
│   ├── rating/rep-engine.ts             # awardRep(), touchDailyLogin(), checkProfileCompleteBonus(), REP_TABLE (v0.7 — replaces rating-engine.ts)
│   ├── rating/referral-lifecycle.ts     # syncReferralLifecycle() — joined→active, +10 Trust Score; invitee-active-90-days REP (v0.7)
│   ├── db/prisma.ts
│   └── utils/email.ts, ogIcon.tsx, codes.ts, uploadthing.ts, achievements.ts
├── prisma/schema.prisma, seed.ts        # seeds only documented rooms — see DECISIONS.md 2026-07-03
└── docs/, CHANGELOG.md, DECISIONS.md, TECH_DEBT.md, BACKLOG.md
```

`components/hall/`, `components/rooms/`, `components/profile/`,
`components/events/`, `lib/referral/` still exist as empty directories,
reserved for later versions. `lib/rating/` is no longer empty (see above).

## Data model (actual, `prisma/schema.prisma`)

All 13 models from the original spec exist: `User`, `UserProfile`, `Room`,
`Message`, `Post`, `Event`, `EventAttendee`, `Review`, `Referral`,
`Achievement`, `UserAchievement`, `RepHistory` (renamed from
`RatingHistory` in `v0.7`), `MarketplaceItem`, `Notification`, plus
`Waitlist`, plus two added in `v0.6`: `Like`, `Comment`.

**Deviations from `ARCHITECTURE.md` §3/§10** (all documented, none
silent):
- `Waitlist` has three extra columns (`age`, `city`, `source`) — see
  [ADR-0004](ADR/0004-extend-waitlist-schema.md).
- `Waitlist` has status tracking (`status`, `reviewedAt`, `reviewedBy`) —
  see [ADR-0012](ADR/0012-waitlist-status-tracking.md).
- `User` has `isAdmin` — see [ADR-0011](ADR/0011-isadmin-field.md).
- `Like`/`Comment` models (`v0.6`) — `ARCHITECTURE.md`'s original `Post`
  table only had a cached `likesCount` integer, no join table for who
  liked what and no comment storage at all. Needed for real
  like-toggling and comment counts once the content feed became real.
  `Comment` exists in the schema (with `isDeleted` for soft-delete) but
  has no API routes yet — see [TECH_DEBT.md](../TECH_DEBT.md).
- `User` reshaped in `v0.7` per [ADR-0015](ADR/0015-claude-md-v2-full-replacement.md):
  `rating` (Int) renamed to `rep`, now a discrete point ledger rather
  than a recomputed weighted score; `influence` dropped entirely (no
  equivalent in the new CLAUDE.md reputation model); `reputation` (the
  0-5 peer-review star average) unchanged in shape but now independent
  of `rep` rather than one of its weighted inputs; added `role`
  (`MemberRole` enum: dominant/submissive/switch/observer/newcomer),
  `interests` (`String[]`, free-text — no fixed taxonomy is specified
  anywhere), `currentStreak`/`longestStreak`/`lastLoginDate` (daily-login
  REP streak tracking).

`User.id` is expected to match the corresponding Supabase
`auth.users.id` exactly (same UUID) — enforced by application code at
creation time (`app/api/admin/applications/[id]/route.ts`), not by a
database constraint. See [ADR-0010](ADR/0010-supabase-auth.md).

No migrations have been run against a real database yet — `DATABASE_URL`
in `.env.local` is a placeholder. See [TECH_DEBT.md](../TECH_DEBT.md).
`prisma/seed.ts` seeds the `general`/`newcomers` rooms and the 7 named
local circles once a real database exists (`npx prisma db seed`) —
**no thematic rooms are seeded**, see [Rooms & real-time](#rooms--real-time-actual-v04)
below.

## API (actual)

- `POST /api/waitlist` — see [API/waitlist.md](API/waitlist.md).
- `GET /api/admin/applications`, `PATCH /api/admin/applications/:id` —
  see [API/admin.md](API/admin.md).
- `PATCH /api/profile` — see [API/profile.md](API/profile.md).
- `GET /api/rooms`, `GET /api/rooms/:slug`, `GET/POST
  /api/rooms/:slug/messages`, `POST /api/admin/rooms` — see
  [API/rooms.md](API/rooms.md).
- `GET/POST /api/posts`, `GET/PATCH/DELETE /api/posts/:id`, `POST
  /api/posts/:id/like` — see [API/posts.md](API/posts.md).
- `POST /api/users/:id/review` — see [API/reviews.md](API/reviews.md).
- `GET/POST /api/uploadthing` — uploadthing's generated handler, not
  independently documented (framework-owned).

Conventions: [API/README.md](API/README.md)
([ADR-0005](ADR/0005-api-conventions.md)).

## Auth & route protection (actual)

`middleware.ts` refreshes the Supabase session on every request and
redirects unauthenticated visitors away from `/hall`, `/rooms`,
`/profile`, `/events`, `/content`, `/feed`, `/library`, `/shop`,
`/marketplace`, `/progress`, `/ritual`, and `/admin` (page routes only —
**not** `/api/admin/*` or `/api/profile`,
which must and do call `getCurrentUser()`/`requireAdmin()` themselves; see
[API/README.md](API/README.md#auth-v02)). Both `middleware.ts` and
`lib/auth/session.ts` degrade to "not logged in" rather than crashing
when Supabase isn't configured — see the near-miss recorded in
`DECISIONS.md` (2026-07-02). `/ritual` was initially missed from
`PROTECTED_PREFIXES` (caught the same day, before it mattered) — its page
component had its own auth check regardless, so this was a
defense-in-depth gap, not an actual hole.

## Initiation Ritual & the Hall (actual, `v0.3`)

`lib/auth/ritual.ts#getRitualStatus()` computes ritual completion from
real data — step 1 (complete profile) is derived live from
`User.bio`/`avatarUrl`, never a self-reported flag. Steps 2/3/5 (Code of
Conduct, Lord Obsidian's intro material, safety rules) and step 4
(newcomers' room) all start `"deferred"` at account creation — there is
no real content or Rooms feature to back them yet, and nothing here fakes
that there is. See [ADR-0013](ADR/0013-initiation-ritual-step4-deferred.md)
(step 4's rationale extends to steps 2/3/5 — same underlying problem,
same resolution, confirmed with Max 2026-07-02).

`lib/rating/level-progress.ts#getLevelProgress()` shows real
progress-to-next-level criteria (reputation stars, referral count) with
real checkmarks; `PRODUCT.md`'s unquantified criteria ("steady activity,"
"high activity," "content or event contribution") are shown as
requirements with no fabricated progress number, since no source doc
defines how to measure them yet.

## Rooms & real-time (actual, `v0.4`)

`lib/rating/room-access.ts#canAccessRoom()` enforces access
server-side (never trusted from the client): a plain `minLevel` check for
most room types, plus a 30-day window from `User.joinedAt` for the
`newcomers` type specifically (`PRODUCT.md` §1: "Level I, first 30
days"). Locked rooms are still returned by `GET /api/rooms` and shown in
`/rooms`, marked with a lock icon — never hidden — per `DESIGN.md`.

Real-time message delivery uses Supabase Realtime's `postgres_changes`
on the `messages` table (`components/shared/RoomChat.tsx`), filtered by
`room_id`. On a new-message event, the client re-fetches the room's
message list rather than merging the raw Realtime payload (which lacks
joined sender info) — simplest correct approach at this scale; see
[TECH_DEBT.md](../TECH_DEBT.md) for the optimization opportunity.
**Requires Realtime to be enabled on the `messages` table in the
Supabase dashboard once the project exists** — this is a one-time manual
step in Supabase's UI, not something Prisma migrations configure.

Only `general`, `newcomers`, and the 7 named local circles (SF, LA,
Miami, NY, Berlin, London, Tokyo — `CLAUDE.md` §7) are seeded
(`prisma/seed.ts`). **No thematic rooms are seeded** — `CLAUDE.md` never
names specific thematic topics, and inventing them would mean guessing
at real community content for an adult platform. `POST /api/admin/rooms`
exists so admins can create thematic rooms with real topics as needed.
See `DECISIONS.md`, 2026-07-03.

## REP engine (actual, `v0.7` — replaces the `v0.5`/`v0.6` weighted rating engine)

**Superseded in `v0.7`** — see [ADR-0015](ADR/0015-claude-md-v2-full-replacement.md).
`lib/rating/rating-engine.ts#recalculateRating()`, which implemented
`ARCHITECTURE.md` §5's weighted formula (reputation/activity/
achievements/referralQuality/events/content components summed into a
single score), **has been deleted**. The new CLAUDE.md (2026-07-05)
specifies a materially different mechanic — REP, a discrete point
ledger — not a refinement of the old formula, so this was a replacement,
not an extension.

`lib/rating/rep-engine.ts#awardRep(userId, points, reason, source)`
increments `User.rep` directly and logs the delta to `RepHistory` (shown
on `/hall`) — the ledger *is* the score, there's nothing to recompute.
`REP_TABLE` records CLAUDE.md's entire earn/lose table verbatim, each
entry flagged `wired: true/false`. Wired today:

- `profileComplete` (+100, one-time) — `checkProfileCompleteBonus()`,
  checked on profile save; "complete" means bio + avatar + city.
- `verificationPassed` (+200) — on admin approval.
- `firstCommunityIntro` (+100, one-time) — on the Initiation Ritual's
  step 4 (first message in the newcomers' room).
- `dailyLogin` (+5) / `streak7Day` (+50) / `streak30Day` (+300) —
  `touchDailyLogin()`, called from `getCurrentUser()` on every
  authenticated request; a conditional `updateMany` (not a naive
  read-then-write) makes it safe against `getCurrentUser()` being
  invoked more than once per page load.
- `invitedNewMember` (+300, to the inviter) — on admin approval of a
  referred applicant.
- `inviteeReachedLevel2` (+500, to the inviter) — from
  `checkLevelUp()`'s promotion logic.
- `inviteeActive90Days` (+1000, to the inviter) — a new milestone in
  `syncReferralLifecycle()`, distinct from the existing 30-day Trust
  Score flip below.

Not wired — real point values, no dependent feature exists yet (events,
moderation/reporting, marketplace, editorial review, thank-you
reactions, challenges, club missions, subscriptions/purchases): see
[TECH_DEBT.md](../TECH_DEBT.md) for the full list, including the entire
"lose" side of the table (no moderation system exists to trigger any of
it).

`User.reputation` (the 0-5 star value, a straight average of a member's
visible `Review` ratings — see [API/reviews.md](API/reviews.md)) is
**independent of REP** as of this version, not a weighted input to it.
`User.influence` was dropped — no equivalent concept exists in the new
model.

**Trust Score** (`lib/rating/referral-lifecycle.ts#syncReferralLifecycle()`):
unchanged by the `v0.7` migration — still `ARCHITECTURE.md` §5's `+10`
per referral reaching `active` status (30+ days after the invitee
joined). The `-20`/`-50` deltas for invitee warnings/removals are **not
implemented** — there's no member-warning or member-removal admin
capability built yet to trigger them from (see
[TECH_DEBT.md](../TECH_DEBT.md)).

## Content & Achievements (actual, `v0.6`, navigation split in `v0.7`)

Originally one page (`/content`), split in `v0.7` into `/feed`
(`app/(platform)/feed/page.tsx` — posts/stories) and `/library`
(`app/(platform)/library/page.tsx` — articles/lectures/courses/
manifestos) to match CLAUDE.md's (2026-07-05) 5-tab nav structure — see
[ADR-0015](ADR/0015-claude-md-v2-full-replacement.md). `/content` now
redirects to `/feed`, kept in case it's linked externally. Both pages
share `components/shared/PostList.tsx` (the post-card rendering) and
`ContentComposer.tsx` (the create form, only offering types the caller
can create). Both filter server-side to `Post.minLevel <= viewer.level`
— out-of-reach posts are excluded entirely, not shown locked (unlike
Rooms; no source doc describes a "locked post" teaser to build toward).

`lib/rating/content-rights.ts#canCreatePostType()` gates *creation*
against `PRODUCT.md` §10's exact table (post/story: Level 1+; article:
Warden/4+; lecture, course: Master/5+; manifesto: admin-only, no member
level grants it) — enforced server-side in `POST /api/posts`, not just
hidden in `ContentComposer.tsx`'s type dropdown. Posts publish
immediately on creation; no draft workflow is documented, so none was
built. `Post.minLevel` (read-access gate) is set by the author at
creation (default 1) and is independent of the creation-rights table —
one controls who can *write* a type, the other who can *see* a specific
post. As of `v0.7`, `POST`/`PATCH /api/posts` also reject content
containing a URL (`http(s)://` or `www.`) — CLAUDE.md's literal "no
external links in posts" rule.

Likes are a real `Like` join table (`POST /api/posts/:id/like`, toggles,
keeps `Post.likesCount` in sync via transaction) — added this version
alongside `Comment` (schema only; no comment API/UI yet, see
[TECH_DEBT.md](../TECH_DEBT.md)).

`lib/rating/level-progression.ts#checkLevelUp()` auto-promotes Level I→II
and II→III, called opportunistically from the Hall page (same pattern as
`syncReferralLifecycle`). It only gates on criteria with a real metric:
reputation, referral count, and — new this version — has-published-content
(replacing `getLevelProgress()`'s previous `met: null` for that
criterion). `PRODUCT.md` §2's "steady activity"/"high activity" criteria
still have no trackable metric anywhere in the source docs, so they
can't gate promotion — a member could be blocked from a level they
otherwise qualify for, or (more likely given the other checks) simply
never gets promoted purely on volume of chat activity. See
[TECH_DEBT.md](../TECH_DEBT.md).

Two new achievements grant automatically: `level-up-2`/`level-up-3` (on
promotion, from `checkLevelUp()`) and `first-post` (on a member's first
published post, from `POST /api/posts`). `first-reputation-star` grants
on a member's first received review (`POST /api/users/:id/review`).
All four join `initiation-complete` (`v0.3`) in
`lib/utils/achievements.ts#DEFINITIONS` — still a small, curated set per
`PRODUCT.md` §7, not a general-purpose achievement framework.

**No real cron/background job infrastructure exists.** Referral
lifecycle transitions are checked opportunistically whenever the
inviter's own Hall page loads, not on a schedule — naturally idempotent
(a referral leaves the `joined` status once promoted, so re-checking
can't double-credit it), but an inviter who never visits `/hall` won't
have their referrals promoted until they do.

## Navigation & onboarding (actual, `v0.7`)

Bottom nav (`components/shared/BottomNav.tsx`) restructured from
Hall/Rooms/Content/Events/Profile to CLAUDE.md's (2026-07-05)
Feed/Shop/Community/Library/Profile — see
[ADR-0015](ADR/0015-claude-md-v2-full-replacement.md). "Community"
points at the existing `/rooms` (groups/people-discovery/dating aren't
built — `/rooms` now links to `/events` instead of Events having its own
tab). "Profile" points at the existing `/hall` (the branded "Hall"
self-view dashboard keeps its in-app name; the nav label is just
CLAUDE.md's generic term). "Shop" is a new honest placeholder — no
product catalog or payment infrastructure exists (see
[TECH_DEBT.md](../TECH_DEBT.md)).

Onboarding role (`User.role`, the `MemberRole` enum) and interest tags
(`User.interests`, free-text — no fixed taxonomy is specified anywhere)
are captured via the existing profile self-edit form
(`/profile/[id]/edit`, `PATCH /api/profile`) rather than a separate
post-approval wizard — CLAUDE.md describes these as onboarding-flow
fields, but nothing in scope needed a dedicated multi-step flow yet.
`locationCity` was made editable in the same form (previously set once,
non-editably, at approval) since it's one of the three fields the
profile-complete REP bonus checks.

## Deployment status

Not deployed. No Vercel project, no Supabase project, no Resend account,
no Uploadthing account connected — all four require Max's own login (see
[TECH_DEBT.md](../TECH_DEBT.md)). The app builds and runs correctly
locally (`npm run build`, `npm run dev`); route protection has been
verified to fail closed (redirect to `/login`) rather than crash in the
absence of real Supabase credentials.

## Security posture (current, honest)

The original `ARCHITECTURE.md` §9 requirements: authentication now exists
(Supabase Auth); Row Level Security, rate limiting, encryption, and GDPR
deletion are **still not implemented** — tracked in
[TECH_DEBT.md](../TECH_DEBT.md). `/api/waitlist` does basic server-side
validation and avoids email enumeration; `/api/admin/*` requires
`isAdmin`, checked server-side on every request, never trusted from the
client.
