# UX — User Journeys & Product Mechanics

> Source: transcribed from `PRODUCT.md` (Max's strategic package, iCloud).
> Same rule as [Vision.md](Vision.md) — this page restates spec, it doesn't
> reinterpret it. **Implementation status is marked explicitly per
> section** — most of this is not built yet.
>
> **As of 2026-07-05**, the expanded `CLAUDE.md`
> ([ADR-0015](ADR/0015-claude-md-v2-full-replacement.md)) supersedes
> `PRODUCT.md`'s level names and reputation-metric model specifically —
> flagged inline below wherever this page still quotes the older
> `PRODUCT.md` language.

## Implementation status

| Stage | Status |
|---|---|
| Stage 0 — pre-platform warm-up, Landing, waitlist | ✅ Built (`v0.1`) |
| Stage 1 — Application review (approve/decline) | ✅ Built (`v0.2`, admin panel v1) — see [API/admin.md](API/admin.md) |
| Stage 2 — Initiation ritual | ✅ **All 5 steps real as of `v0.25` (2026-08-03)**: complete-profile and introduce-yourself-in-Newcomers are checked against real data; Code of Conduct, Lord Obsidian's intro, and the Safety & Respect Guidelines are all real content the member reads and confirms. See [ADR-0013](ADR/0013-initiation-ritual-step4-deferred.md) (includes a 2026-07-04 update on step 4 and a new deadlock risk it introduced — see [TECH_DEBT.md](../TECH_DEBT.md)) |
| Stage 3 — Progression (levels, reputation, REP) | ✅ **Built in `v0.5`-`v0.7`**: real reviews (`/profile[id]`) drive the `reputation` star average; as of `v0.7`, **REP** (`lib/rating/rep-engine.ts`) replaces the old weighted rating formula — a discrete point ledger per CLAUDE.md's earn/lose table, wired for profile-complete, verification-passed, first-community-intro, daily-login streaks, and three referral milestones (see [docs/Architecture.md](Architecture.md#rep-engine-actual-v07-replaces-the-v05v06-weighted-rating-engine)); the rest of the table is recorded but not wireable yet (see `TECH_DEBT.md`). Trust Score's `+10` referral-activation bonus is unchanged and still real. Level I→II and II→III auto-promotion is real as of `v0.6` (`lib/rating/level-progression.ts#checkLevelUp`), gated on the criteria that have a real metric (reputation, referral count, has-published-content); "steady/high activity" stay unmeasured (see `TECH_DEBT.md`); Trust Score's `-20`/`-50` deltas aren't wired (no member-warning/removal capability exists to trigger them). |
| Stage 4 — Elite tiers (Warden/Master/Council) | ❌ Not built — `PRODUCT.md` §2 says these are appointed, not earned; `getLevelProgress()` reflects that (no fabricated checklist past Level III) |
| Stage 5 — Purge (periodic membership review) | ❌ Not built |

## The full user journey

**Stage 0 — Before the platform (warm-up).** A person sees content on
Instagram/X/YouTube/Threads → learns about Obsidian Club → lands on the
Landing Page → understands this is an application, not a signup → submits
an application → enters the Waitlist. **← this repo currently implements
exactly this far, via `/api/waitlist`.**

**Stage 1 — Application.** Fields: display name, age (18+, verified),
location (city/country), a short note on experience/interests, referral
code (if any), acceptance of the club's Code of Conduct. Status: `Pending`
→ `Approved` or `Declined` (declined applications get **no explanation** —
that opacity is intentional, part of the atmosphere).

**Stage 2 — Initiation.** On approval: an email in the voice of "Your
access has been granted." First login triggers a mandatory Initiation
Ritual: (1) complete the profile, (2) read and accept the Code of Conduct,
(3) complete Lord Obsidian's introductory material, (4) introduce yourself
in the newcomers' room, (5) confirm the safety/respect rules. Completing it
grants **Level I** and baseline access.

**Stage 3 — Progression.** Members grow via room activity, content
creation, event attendance, quality invitations, positive reviews from
other members, completing rituals/tasks, and accumulating reputation and
rating.

**Stage 4 — Elite.** Warden, Master, Council — by invitation or system
promotion (thresholds below).

**Stage 5 — Purge.** Every 6–12 months, low-rated members get a warning,
lose partial access, move to inactive, or are removed. See
[Philosophy.md](Philosophy.md) for the reasoning.

## Member levels

**Renamed 2026-07-05** per the expanded `CLAUDE.md`
([ADR-0015](ADR/0015-claude-md-v2-full-replacement.md)) — the original
`PRODUCT.md` names (Initiate, Member, Senior Member, Mentor, Master,
Council Member) are superseded by the names below, centralized in
`lib/rating/levels.ts`. The requirements/access-unlocked columns are
still `PRODUCT.md`'s original mechanics — only the names changed.

| Level | Requirements to reach it | Access unlocked |
|---|---|---|
| I — Initiate | Complete the Initiation Ritual | General rooms, basic content, entry-level events |
| II — Keeper | Steady activity, 2+ star reputation, ≥1 quality invite | Thematic rooms, expanded content, local circles |
| III — Steward | High activity, 3+ stars, content/event contribution | Senior-only rooms, right to create content, full library |
| Warden | 4+ stars, proven community contribution, peer trust | Wardens' room, expanded moderation rights |
| Master | Exceptional contribution, 5 stars, Council's trust | Nearly all rooms, right to run teaching events |
| Council | Personal invitation from Lord Obsidian | Club governance, strategic decisions |
| Lord Obsidian | Outside the system | Everything — the founder/archetype, not a member |

## The member metrics

**Reshaped 2026-07-05** — `PRODUCT.md`'s original four metrics
(reputation, rating, influence, Trust Score) are now three; `rating` was
replaced by REP (a different mechanic, not a rename) and `influence` was
dropped entirely (no equivalent exists in the new model). See
[ADR-0015](ADR/0015-claude-md-v2-full-replacement.md).

- **Reputation** — 1–5 stars. Driven by conduct, communication quality,
  quality of who you invite, rule adherence. Independent of REP (below)
  as of `v0.7` — previously one of several weighted inputs to `rating`.
- **REP** — a discrete point ledger (`User.rep`), earned/lost through
  specific actions (e.g. +100 profile complete, +5 daily login, -100
  confirmed report) rather than a recomputed composite score. Full
  earn/lose table and which actions are actually wired today:
  `lib/rating/rep-engine.ts#REP_TABLE`, and see
  [docs/Architecture.md](Architecture.md#rep-engine-actual-v07-replaces-the-v05v06-weighted-rating-engine).
- **Trust Score** — starts at 100. `+10` per invitee who's still active
  after 30 days, `-20` if an invitee gets a warning, `-50` if an invitee is
  removed from the club. Unchanged by the `v0.7` migration.

## Referral system ("Trust Chain")

Every member gets a personal invite link. The platform tracks who invited
whom, how many joined via the link, and each invitee's ongoing behavior.
**An invite is an act of responsibility**, not a casual referral — the
inviter's rating and Trust Score move with the invitee's conduct (see
[Philosophy.md](Philosophy.md)).

Invite limits by level: **I** → 2, **II** → 5, **III** → 10, **Warden** →
20, **Master/Council** → unlimited.

## Rooms

✅ **Built in `v0.4`** — `/rooms`, `/rooms/[slug]`, real-time chat. `/rooms`
is the nav's "Community" tab as of `v0.7` (see Navigation below). See
[docs/Architecture.md](Architecture.md#rooms--real-time-actual-v04) and
[API/rooms.md](API/rooms.md).

Types: general, thematic, level-gated, Wardens-only, Masters-only,
Council-only, a newcomers' room (Level I, first 30 days), and city-based
local circles (starting set: SF, LA, Miami, NY, Berlin, London, Tokyo —
expanding with the community). **Only `general`, `newcomers`, and the 7
named local circles are seeded** — no thematic room topics are named
anywhere in the source docs, so none are invented; admins create
thematic rooms as the community needs them (`POST /api/admin/rooms`).

## Content

✅ **Built in `v0.6`, split into `/feed` + `/library` in `v0.7`** —
real feed (posts/stories) and library (articles/lectures/courses/
manifestos), `POST/GET/PATCH/DELETE /api/posts`. See
[docs/Architecture.md](Architecture.md#content--achievements-actual-v06-navigation-split-in-v07)
and [API/posts.md](API/posts.md).

Types: posts/stories (the ephemeral feed, `/feed`), articles, lectures,
courses, manifestos (curated library types, `/library`). Creation rights
by level, per `PRODUCT.md` §10's exact table (previously mistranscribed
in this file as "Level II+" for articles — corrected 2026-07-04, see
`DECISIONS.md`):

| Type | Minimum level to create |
|---|---|
| Post, Story | Level 1 (Initiate) |
| Article | Warden (Level 4)+ |
| Lecture | Master (Level 5)+ |
| Course | Master (Level 5)+ |
| Manifesto | Admin only — no member level grants it |

No external links allowed in post content (`CLAUDE.md`, 2026-07-05) —
enforced server-side on create/edit. Types not built: podcasts, video.
Read access is gated by `Post.minLevel` (set by the author at creation,
default 1) — separate from the creation-rights table above, which gates
who can *write* each type.

## Navigation (`v0.7`)

**Restructured 2026-07-05** per the expanded `CLAUDE.md`
([ADR-0015](ADR/0015-claude-md-v2-full-replacement.md)) — bottom nav is
now Feed / Shop / Community / Library / Profile (was Hall / Rooms /
Content / Events / Profile):

- **Feed** (`/feed`) — the ephemeral posts/stories timeline.
- **Shop** (`/shop`) — a placeholder; see Shop & Payments below.
- **Community** (`/rooms`) — CLAUDE.md's description also includes
  groups, people-discovery, and events-as-a-filter; only Rooms is built,
  Events is linked from there rather than having its own tab.
- **Library** (`/library`) — curated content (articles/lectures/courses/
  manifestos); CLAUDE.md's description also mentions books and wellness
  content, neither of which exist as separate verticals yet.
- **Profile** (`/hall`) — the existing Hall self-view dashboard; "Hall"
  is the in-app/brand name, "Profile" is just the nav label.

## Onboarding role & interests (`v0.7`)

CLAUDE.md's (2026-07-05) registration flow adds a role selection
(Dominant/Submissive/Switch/Observer/Newcomer) and interest tags,
described as "configures Feed algorithm immediately." Both fields exist
(`User.role`, `User.interests`) and are captured via the profile
self-edit form — **not** a separate post-approval onboarding wizard,
since nothing else in scope needed a dedicated multi-step flow.
Interests are free text (no fixed taxonomy is specified anywhere in the
source docs) and **aren't used to rank the Feed yet** — the Feed is
still a plain reverse-chronological list, see `TECH_DEBT.md`.

## Events

Every event carries: title/description, minimum level, minimum Trust
Score, seat limit, guest list, price (or free by level), dress code,
conduct rules, format (online/offline/hybrid), and a post-event photo/video
archive.

## Marketplace

A vitrine, not a shop: merch, limited collections, tickets, gift cards,
digital collections, courses/books — "every product like a gallery exhibit,
not an item on a shelf." This is `ARCHITECTURE.md`'s original, smaller
marketplace scope (the `MarketplaceItem` model). CLAUDE.md's (2026-07-05)
"Shop" nav tab is a distinct, larger scope layered on top — Obsidian
Club's own physical products plus a practitioner-services marketplace
with crypto/card payments and escrow — see
[Vision.md](Vision.md#product-ecosystem-oc_mastermd--mostly-not-yet-built-see-backlogmd)
and `TECH_DEBT.md`. Neither is built.

## Progress dashboard (member's own view)

A member should always be able to see: current level, exactly what's
needed for the next one, why their rating is moving, how their reputation
is changing, which achievements are open/locked, which tasks are
available, which doors are still closed, and what more trust would unlock.
