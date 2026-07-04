# UX — User Journeys & Product Mechanics

> Source: transcribed from `PRODUCT.md` (Max's strategic package, iCloud).
> Same rule as [Vision.md](Vision.md) — this page restates spec, it doesn't
> reinterpret it. **Implementation status is marked explicitly per
> section** — most of this is not built yet.

## Implementation status

| Stage | Status |
|---|---|
| Stage 0 — pre-platform warm-up, Landing, waitlist | ✅ Built (`v0.1`) |
| Stage 1 — Application review (approve/decline) | ✅ Built (`v0.2`, admin panel v1) — see [API/admin.md](API/admin.md) |
| Stage 2 — Initiation ritual | ⚠️ **Steps 1 and 4 real (`v0.3`/`v0.5`)**: complete-profile and introduce-yourself-in-Newcomers are both checked against real data. Steps 2/3/5 still need Code of Conduct / Lord Obsidian's intro / safety-rules content Max hasn't written yet — shown honestly as "pending," not faked complete. See [ADR-0013](ADR/0013-initiation-ritual-step4-deferred.md) (includes a 2026-07-04 update on step 4 and a new deadlock risk it introduced — see [TECH_DEBT.md](../TECH_DEBT.md)) |
| Stage 3 — Progression (levels, reputation, rating) | ✅ **Built in `v0.5`/`v0.6`**: real reviews (`/profile/[id]`) drive reputation; the rating engine (`ARCHITECTURE.md` §5's weighted formula) computes overall rating and logs changes to `RatingHistory` (shown on `/hall`); Trust Score's `+10` referral-activation bonus is real. Level I→II and II→III auto-promotion is real as of `v0.6` (`lib/rating/level-progression.ts#checkLevelUp`), gated on the criteria that have a real metric (reputation, referral count, has-published-content); "steady/high activity" stay unmeasured (see `TECH_DEBT.md`). `events` rating component is still an honest zero; `content` isn't (see [docs/Architecture.md](Architecture.md#rating-engine-actual-v05)); Trust Score's `-20`/`-50` deltas aren't wired (no member-warning/removal capability exists to trigger them). |
| Stage 4 — Elite tiers (Mentor/Master/Council) | ❌ Not built — `PRODUCT.md` §2 says these are appointed, not earned; `getLevelProgress()` reflects that (no fabricated checklist past Level III) |
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

**Stage 4 — Elite.** Mentor, Master, Council — by invitation or system
promotion (thresholds below).

**Stage 5 — Purge.** Every 6–12 months, low-rated members get a warning,
lose partial access, move to inactive, or are removed. See
[Philosophy.md](Philosophy.md) for the reasoning.

## Member levels

| Level | Requirements to reach it | Access unlocked |
|---|---|---|
| I — Initiate | Complete the Initiation Ritual | General rooms, basic content, entry-level events |
| II — Member | Steady activity, 2+ star reputation, ≥1 quality invite | Thematic rooms, expanded content, local circles |
| III — Senior Member | High activity, 3+ stars, content/event contribution | Senior-only rooms, right to create content, full library |
| Mentor | 4+ stars, proven community contribution, peer trust | Mentors' room, expanded moderation rights |
| Master | Exceptional contribution, 5 stars, Council's trust | Nearly all rooms, right to run teaching events |
| Council Member | Personal invitation from Lord Obsidian | Club governance, strategic decisions |
| Lord Obsidian | Outside the system | Everything — the founder/archetype, not a member |

## The four member metrics

- **Reputation** — 1–5 stars. Driven by conduct, communication quality,
  quality of who you invite, rule adherence.
- **Rating** — a composite score of overall value to the club (weighted
  sum of reputation, activity, achievements, referral quality, event
  participation, content contribution, influence — exact weights are an
  engineering decision, see `ARCHITECTURE.md` §5 and
  [ADR/](ADR/) once implemented).
- **Influence** — weight of a member's voice. Not purchasable — earned via
  content quality, discussion depth, peer trust, successful invitations,
  organizing events.
- **Trust Score** — starts at 100. `+10` per invitee who's still active
  after 30 days, `-20` if an invitee gets a warning, `-50` if an invitee is
  removed from the club.

## Referral system ("Trust Chain")

Every member gets a personal invite link. The platform tracks who invited
whom, how many joined via the link, and each invitee's ongoing behavior.
**An invite is an act of responsibility**, not a casual referral — the
inviter's rating and Trust Score move with the invitee's conduct (see
[Philosophy.md](Philosophy.md)).

Invite limits by level: **I** → 2, **II** → 5, **III** → 10, **Mentor** →
20, **Master/Council** → unlimited.

## Rooms

✅ **Built in `v0.4`** — `/rooms`, `/rooms/[slug]`, real-time chat. See
[docs/Architecture.md](Architecture.md#rooms--real-time-actual-v04) and
[API/rooms.md](API/rooms.md).

Types: general, thematic, level-gated, Mentors-only, Masters-only,
Council-only, a newcomers' room (Level I, first 30 days), and city-based
local circles (starting set: SF, LA, Miami, NY, Berlin, London, Tokyo —
expanding with the community). **Only `general`, `newcomers`, and the 7
named local circles are seeded** — no thematic room topics are named
anywhere in the source docs, so none are invented; admins create
thematic rooms as the community needs them (`POST /api/admin/rooms`).

## Content

✅ **Built in `v0.6`** — `/content`, real feed + library, `POST/GET/PATCH/DELETE
/api/posts`. See [docs/Architecture.md](Architecture.md#content--achievements-actual-v06)
and [API/posts.md](API/posts.md).

Types: posts/stories (the ephemeral feed), articles, lectures, courses,
manifestos (curated library types). Creation rights by level, per
`PRODUCT.md` §10's exact table (previously mistranscribed in this file as
"Level II+" for articles — corrected 2026-07-04, see `DECISIONS.md`):

| Type | Minimum level to create |
|---|---|
| Post, Story | Level 1 (Initiate) |
| Article | Mentor (Level 4)+ |
| Lecture | Master (Level 5)+ |
| Course | Master (Level 5)+ |
| Manifesto | Admin only — no member level grants it |

Types not built: podcasts, video. Read access is gated by `Post.minLevel`
(set by the author at creation, default 1) — separate from the
creation-rights table above, which gates who can *write* each type.

## Events

Every event carries: title/description, minimum level, minimum Trust
Score, seat limit, guest list, price (or free by level), dress code,
conduct rules, format (online/offline/hybrid), and a post-event photo/video
archive.

## Marketplace

A vitrine, not a shop: merch, limited collections, tickets, gift cards,
digital collections, courses/books — "every product like a gallery exhibit,
not an item on a shelf."

## Progress dashboard (member's own view)

A member should always be able to see: current level, exactly what's
needed for the next one, why their rating is moving, how their reputation
is changing, which achievements are open/locked, which tasks are
available, which doors are still closed, and what more trust would unlock.
