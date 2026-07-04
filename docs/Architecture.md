# Architecture (as-built)

> This is the **living, as-built** counterpart to Max's original
> `ARCHITECTURE.md` (iCloud package). Where the two disagree, it's because a
> documented decision (linked below) changed course — never a silent drift.
> If you find a mismatch that ISN'T explained by a linked ADR, that's a
> conflict: stop and flag it (see [docs/README.md](README.md)).

Current version: **v0.5.0** (Reputation). `package.json`'s
`version` field is the single source of truth for the current version
number.

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
│   │   ├── rooms/page.tsx               # real room list, locked rooms shown per DESIGN.md
│   │   ├── rooms/[slug]/page.tsx        # room chat — real-time via Supabase Realtime
│   │   ├── content|events/page.tsx      # "coming soon" placeholders (v0.6/v0.7 build the real thing)
│   │   └── marketplace|progress/        # still empty — later versions
│   ├── api/
│   │   ├── waitlist/route.ts
│   │   ├── admin/applications/route.ts, [id]/route.ts
│   │   ├── admin/rooms/route.ts         # admin creates thematic rooms — see docs/API/rooms.md
│   │   ├── profile/route.ts             # self-edit only, see API/profile.md
│   │   ├── rooms/route.ts, [slug]/route.ts, [slug]/messages/route.ts
│   │   ├── users/[id]/review/route.ts   # peer reviews, see API/reviews.md
│   │   └── uploadthing/core.ts, route.ts
│   ├── icons/icon-192.png/route.tsx, icon-512.png/route.tsx
│   ├── layout.tsx                       # fonts, metadata, Analytics
│   └── globals.css                      # full DESIGN.md token system
├── components/
│   ├── ui/Logo.tsx                      # OC monogram (placeholder, see TECH_DEBT)
│   └── shared/WaitlistForm.tsx, Reveal.tsx, ApplicationsQueue.tsx,
│       AvatarUploadButton.tsx, BottomNav.tsx, ComingSoon.tsx, ProfileEditForm.tsx,
│       RoomChat.tsx, ReviewForm.tsx
├── lib/
│   ├── auth/
│   │   ├── supabase-browser.ts          # Client Component Supabase client
│   │   ├── supabase-server.ts           # Server Component / Route Handler client
│   │   ├── supabase-admin.ts            # service-role client — server-only
│   │   ├── session.ts                   # getCurrentUser()
│   │   ├── require-admin.ts             # requireAdmin()
│   │   └── ritual.ts                    # getRitualStatus() — real, computed, see ADR-0013
│   ├── rating/level-progress.ts         # getLevelProgress() — real criteria only, no fabricated metrics
│   ├── rating/room-access.ts            # canAccessRoom() — level gate + newcomers' 30-day window
│   ├── rating/rating-engine.ts          # recalculateRating() — ARCHITECTURE.md §5's weighted formula
│   ├── rating/referral-lifecycle.ts     # syncReferralLifecycle() — joined→active, +10 Trust Score
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
`Achievement`, `UserAchievement`, `RatingHistory`, `MarketplaceItem`,
`Notification`, plus `Waitlist`.

**Deviations from `ARCHITECTURE.md` §3/§10** (all documented, none
silent):
- `Waitlist` has three extra columns (`age`, `city`, `source`) — see
  [ADR-0004](ADR/0004-extend-waitlist-schema.md).
- `Waitlist` has status tracking (`status`, `reviewedAt`, `reviewedBy`) —
  see [ADR-0012](ADR/0012-waitlist-status-tracking.md).
- `User` has `isAdmin` — see [ADR-0011](ADR/0011-isadmin-field.md).

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
- `POST /api/users/:id/review` — see [API/reviews.md](API/reviews.md).
- `GET/POST /api/uploadthing` — uploadthing's generated handler, not
  independently documented (framework-owned).

Conventions: [API/README.md](API/README.md)
([ADR-0005](ADR/0005-api-conventions.md)).

## Auth & route protection (actual)

`middleware.ts` refreshes the Supabase session on every request and
redirects unauthenticated visitors away from `/hall`, `/rooms`,
`/profile`, `/events`, `/content`, `/marketplace`, `/progress`, `/ritual`,
and `/admin` (page routes only — **not** `/api/admin/*` or `/api/profile`,
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

## Rating engine (actual, `v0.5`)

`lib/rating/rating-engine.ts#recalculateRating()` implements
`ARCHITECTURE.md` §5's weighted formula exactly for the one
fully-specified component (`reputation = stars × 6`, capping at the
documented 30-point weight) and with **documented, reasonable defaults**
for the others, since the source doc names what counts but not the exact
curve:

- `activity` (weight 20): `min(20, messageCount × 0.2 + postCount × 1)`.
- `achievements` (weight 15): sum of earned achievements'
  `ratingBonus`, capped at 15.
- `referralQuality` (weight 20): sum of the inviter's `Referral.impactScore`
  values, capped at 20.
- `events` (weight 10) and `content` (weight 5): **always 0** — no real
  Events (`v0.7`) or content-creation (`v0.6`) feature exists yet to
  measure them from. This is an honest zero, not the full weight and not
  a fabricated partial score.

Every recalculation logs its delta to `RatingHistory` (shown on
`/hall`). Reputation itself (`User.reputation`, the 0-5 star value that
feeds the formula above) is a straight average of a member's visible
`Review` ratings — see [API/reviews.md](API/reviews.md).

**Trust Score** (`lib/rating/referral-lifecycle.ts#syncReferralLifecycle()`):
implements `ARCHITECTURE.md` §5's `+10` per referral reaching `active`
status (30+ days after the invitee joined) exactly as specified. The
`-20`/`-50` deltas for invitee warnings/removals are **not implemented**
— there's no member-warning or member-removal admin capability built
yet to trigger them from (see [TECH_DEBT.md](../TECH_DEBT.md)).

**No real cron/background job infrastructure exists.** Referral
lifecycle transitions are checked opportunistically whenever the
inviter's own Hall page loads, not on a schedule — naturally idempotent
(a referral leaves the `joined` status once promoted, so re-checking
can't double-credit it), but an inviter who never visits `/hall` won't
have their referrals promoted until they do.

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
