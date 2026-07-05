# Vision

> **Source, in priority order:** an expanded `CLAUDE.md` (shared directly
> in chat, 2026-07-05) is authoritative wherever it conflicts with
> anything below — see
> [ADR-0015](ADR/0015-claude-md-v2-full-replacement.md). Below that,
> `OC_MASTER.md` + the revised `CLAUDE.md` (Max's iCloud docs folder,
> delivered 2026-07-04 via `files.zip`) — see
> [ADR-0014](ADR/0014-adopt-oc-master-as-strategic-source.md). Where both
> are silent, the original `CLAUDE.md`/`PRODUCT.md` (2026-06-29) still
> apply. If this page ever seems to disagree with any of these, the
> source docs are correct — flag the mismatch, don't silently trust this
> page.

## What Obsidian Club is

Obsidian Club is a closed, premium community platform for BDSM
practitioners — 18-60, all genders/orientations (kept in separate safe
groups). **Explicitly not a porn platform** — a lifestyle and practice
community: elegant, safe, gamified, premium. Think Instagram + Facebook +
marketplace + gamification, for an audience that's never had a safe,
premium home of its own.

It is **not a social network**. It is the operating system of a closed
club, where the actual product is status, belonging, trust, reputation,
and access.

**A user does not register. They are granted access.**

**The problem it solves** (`OC_MASTER.md`): this audience is scattered
across Reddit/Fetlife/Telegram/Twitter — judged, scammed, unsafe, with no
trusted community, no premium products, no verified practitioners, no real
education, and no shared identity. Obsidian Club exists to be all of
that in one place, with Lord Obsidian at the head of it.

## Who's building it

- **Founder / product owner:** Max (Maksym) — 15+ years running production
  businesses. Doesn't write code or do ops; directs.
- **Team:** Max + Claude (strategy) + Claude Code (implementation) +
  ChatGPT.
- No external engineers — the platform is built entirely from the doc
  package by Claude Code.

## The central figure

**Lord Obsidian** is the singular, irreplaceable image of the club's
founder and voice — not a member, not a level, a separate entity: a
symbol, an archetype, the center of gravity for the whole platform.
Never reveals their identity; communicates via announcements, personal
invites, and rare appearances. Sets the entire community's cultural tone.
**Confirmed (`OC_MASTER.md`): Lord Obsidian is a solo persona — Max
himself** — never a team voice, even though a small team works behind it.
Full canonical detail (appearance, voice, values, symbolism) is in
[LordObsidian.md](LordObsidian.md), added 2026-07-04.

## Access model — three paths (`OC_MASTER.md`)

1. **Product purchase** — buy an Obsidian physical product → Lord Obsidian
   sends a personal invite with the package → unique registration link.
2. **Member referral** — an existing member sends their personal invite
   link directly; the inviter's rating is tied to the invitee's behavior
   going forward.
3. **Manual review (first 1000 members)** — Max personally reviews every
   application; criteria are vibe, intent, and profile completeness, no
   explanation given either way. **This is the path this repo has
   actually built** (the waitlist + admin-approval flow, `v0.1`-`v0.2`) —
   Paths 1 and 2 aren't implemented yet; see [BACKLOG.md](../BACKLOG.md).

## Member levels (overview — full mechanics in [UX.md](UX.md))

**Decided as of 2026-07-05**: Initiate, Keeper, Steward, Warden, Master,
Council — the expanded `CLAUDE.md`'s naming
([ADR-0015](ADR/0015-claude-md-v2-full-replacement.md)), implemented
throughout this codebase (Hall, Ritual, REP engine). This supersedes
`PRODUCT.md`'s original six names (Initiate, Member, Senior Member,
Mentor, Master, Council Member) and closes the "TBD" `OC_MASTER.md` had
left open (it only offered "Initiate → Devotee → Master → Lord" as an
illustrative, non-binding example).

**Lord Obsidian sits outside this system.** Singular. Unreachable.

## Product ecosystem (`OC_MASTER.md` — mostly not yet built, see BACKLOG.md)

Beyond the community platform itself:

1. **Physical products** — Standard / Premium / Extra Premium (the latter:
   $20,000-$100,000, platinum/gold/diamond, for ultra-high-net-worth
   clients and collectors) BDSM accessories, under the Obsidian Club
   brand.
2. **Marketplace** — practitioners list sessions (online/offline),
   coaching, and events; the club takes a commission; visibility scales
   with rating.
3. **Education** — beginner courses (~$50) and advanced content, authored
   by vetted community experts and outside specialists.
4. **Books & media** — a curated, BDSM-relevant library sold on
   commission.
5. **Mental health & wellness** — bookable therapists/psychologists who
   understand the lifestyle, plus crisis resources.
6. **Community features** — feed, groups (by orientation/practice/
   geography), events, rating-gated DMs, public rating on profiles.

None of verticals 1, 2 (services booking specifically — a merch/ticket
marketplace already exists), 3, 4, or 5 are built. They need real
specification (product data, payment flows, licensing/liability
questions for health services) before implementation — not something to
guess into existence from `OC_MASTER.md`'s bullet points alone.

## Monetization (`OC_MASTER.md` — not yet built)

Freemium + tiered subscription + product subscription: **Tier 0** (free,
"Initiate" — basic community + Standard product purchases), **Tier 1**
(~$20-30/mo, unlocked by a rating/purchase threshold — full community,
groups, events, marketplace), **Tier 2** (~$50/mo — full access,
marketplace priority, exclusive content), **Tier 3** (recurring physical
product subscription, ships new items automatically). Plus marketplace
commission from practitioners. None of this billing/tiering exists in
the codebase yet.

## Platform structure, at a glance (implemented pieces)

- **The Hall** (`/hall`) — a personal status dashboard, not a feed; the
  nav's "Profile" tab as of `v0.7`
- **Rooms** (`/rooms`) — general, thematic, level-gated,
  warden/master/council-only, and city-based local circles ✅ built
  (`v0.4`); the nav's "Community" tab as of `v0.7`
- **Feed** (`/feed`) — posts/stories, the ephemeral timeline ✅ built
  (`v0.6`, split from `/content` in `v0.7`)
- **Library** (`/library`) — articles, lectures, manifestos, courses; a
  partly-free, partly-level-gated content library ✅ built (`v0.6`,
  split from `/content` in `v0.7`). Podcasts, video, books, and wellness
  content aren't built.
- **Shop** (`/shop`) — Obsidian Club's own products plus a practitioner
  marketplace, per `CLAUDE.md`'s (2026-07-05) Shop & Payments section —
  placeholder only (`v0.7`); needs a real product catalog and payment
  infrastructure, see `TECH_DEBT.md`
- **Events** — closed parties, dinners, meetups, trips; each gated by
  level, seat limit, dress code, and Trust Score — not yet built (`v0.8`,
  currently a placeholder linked from Rooms)
- **Marketplace** (`ARCHITECTURE.md`'s original, smaller scope) — merch,
  limited collections, tickets, digital collections; a vitrine, not a
  storefront — not yet built (`v0.8`); the broader `CLAUDE.md`/
  `OC_MASTER.md` Shop & Payments vision above is separate, larger scope

## Platform requirement: PWA only, no native apps

**Decided in `OC_MASTER.md`, explicitly and with reasoning: no native
iOS/Android app, ever — web-first PWA only.** App Store/Google Play
policy is hostile to 18+ lifestyle content; a PWA installs to the home
screen, feels native, and has zero platform gatekeeper risk (same
approach Fetlife uses intentionally). **This corrects the original
`ROADMAP.md`'s later-superseded plan for iOS/Android apps** (previously
reflected in this repo's `BACKLOG.md` as `v1.2`/`v1.3` — now removed).

In parallel with platform development: a 6-month audience warm-up across
Instagram, Threads, X, Facebook, YouTube Shorts, and YouTube (see
`CONTENT_SYSTEM.md`) — not this repo's concern, but the context for why
the Landing Page (`v0.1`) exists and is optimized to convert visitors
into a waitlist.

## Inspirations, explicitly not copied

Instagram (visual language), Threads (fast thought-stream), Discord
(rooms, role hierarchy), Reddit (topic discussion), LinkedIn (member
status), Duolingo (gamified progress, streaks), Rolex (premium,
unattainable, aspirational belonging), Alo Yoga (lifestyle brand
community, online + offline). **Obsidian Club copies none of them — it
is its own system.**
