# ADR-0015: Adopt the expanded CLAUDE.md (2026-07-05) as a full replacement — migrate levels, reputation, navigation, onboarding

**Status:** Accepted
**Date:** 2026-07-05

## Context

On 2026-07-05, Max shared a significantly expanded `CLAUDE.md` (pasted directly
in chat; the corresponding `CLAUDE.md - Google Документы.html` export in the
iCloud folder turned out to be an unusable JS-gated viewer shell with no
actual document content, so the pasted text is the only source). Unlike the
`OC_MASTER.md` pivot ([ADR-0014](0014-adopt-oc-master-as-strategic-source.md)),
which mostly *added* future scope on top of the existing build, this new
document **directly conflicts with mechanics already live in the product**:

- **Level names** — `PRODUCT.md` §2 / the existing build: Initiate, Member,
  Senior Member, Mentor, Master, Council Member. New `CLAUDE.md`: Initiate,
  Keeper, Steward, Warden, Master, Council.
- **Reputation model** — the existing `lib/rating/rating-engine.ts` computed a
  single weighted score from components (reputation stars, activity,
  achievements, referral quality, events, content) per `ARCHITECTURE.md` §5.
  New `CLAUDE.md` specifies a completely different mechanic: **REP**, a
  discrete point ledger with a fixed table of earn/lose actions (e.g. +100
  profile complete, +5 daily login, -100 confirmed report).
- **Navigation** — existing bottom nav: Hall / Rooms / Content / Events /
  Profile. New `CLAUDE.md`: Feed / Shop / Community / Library / Profile (5
  tabs, top bar with logo + notifications + avatar).
- **Registration/onboarding** — existing: email/password only (Supabase
  Auth), approval-gated, no role/interest capture. New `CLAUDE.md` adds
  phone+password, Google/Apple Sign-In, and an onboarding flow capturing
  nickname, avatar, **role** (Dominant/Submissive/Switch/Observer/Newcomer),
  and **interest tags**.
- **Payments** — nothing existed before. New `CLAUDE.md` specifies crypto
  (USDT/BTC/ETH) as the primary payment method, adult-friendly card
  processors (Segpay/Epoch/CCBill) as secondary, and escrow logic for the
  marketplace.
- **Feed** — existing: a plain reverse-chronological list. New `CLAUDE.md`:
  For You / Following tabs, algorithmic ranking, video posts (≤60s), and an
  explicit "no external links in posts" rule.

Asked Max directly (`AskUserQuestion`) whether this is a full replacement
requiring migration, or a v2 vision to layer on top of an unchanged MVP (the
same shape of question that resolved the OC_MASTER.md pivot). Answer:
**"Полная замена, мигрируем"** — full replacement, migrate.

## Decision

Treat the new `CLAUDE.md` as authoritative over `PRODUCT.md`/`ARCHITECTURE.md`
wherever they conflict, and migrate the live product rather than layering the
new spec on top as untouched future scope. Concretely, in this pass:

1. **Levels** — centralized the display-name map in `lib/rating/levels.ts`
   (previously duplicated across three files), renamed to
   Initiate/Keeper/Steward/Warden/Master/Council. No schema change — `level`
   was already a plain `Int`, this is a label change only.
2. **Reputation** — replaced `lib/rating/rating-engine.ts` entirely with
   `lib/rating/rep-engine.ts`. `User.rating` renamed to `User.rep`, `Int`,
   incremented directly by discrete point awards rather than recomputed from
   a weighted formula. `RatingHistory` renamed to `RepHistory` (same shape,
   `delta`/`reason`/`source`). `User.influence` **dropped** — no equivalent
   concept exists in the new model. `User.reputation` (the peer-review star
   average) is **kept**, now explicitly independent of REP rather than one
   of its weighted inputs. Safe to rename outright (not `@deprecated`-and-add)
   because no real Supabase project/data exists yet — see `TECH_DEBT.md`'s
   "Now" blockers.
3. **REP triggers** — `REP_TABLE` in `rep-engine.ts` records the *entire*
   earn/lose table from `CLAUDE.md`, verbatim, each entry flagged
   `wired: true/false`. Only wired what's mechanically real today: profile
   100% complete, verification passed (admin approval), first community
   introduction (Initiation Ritual step 4), daily login + 7/30-day streaks
   (new `User.currentStreak`/`longestStreak`/`lastLoginDate` fields),
   invited-new-member and invitee-reached-Level-II (existing referral/
   level-progression hooks), invitee-active-90-days (new milestone,
   distinct from the existing 30-day Trust Score flip). Everything else
   (events, moderation/reports, marketplace, editorial review, thank-you
   reactions, challenges, club missions, subscriptions) is recorded but not
   wireable — the feature it depends on doesn't exist. See `TECH_DEBT.md`.
4. **Navigation** — `/content` split into `/feed` (posts/stories) and
   `/library` (article/lecture/course/manifesto), `/shop` added as an honest
   placeholder (same pattern as `/events`), bottom nav relabeled to
   Feed/Shop/Community/Library/Profile. "Community" points at the existing
   `/rooms` (groups/people-discovery/dating aren't built); "Profile" points
   at the existing `/hall` (the branded "Hall" self-view stays the in-app
   name — the nav label is just the generic term from `CLAUDE.md`). `/content`
   kept as a redirect to `/feed`, not deleted, in case it's linked externally.
5. **Onboarding** — added `User.role` (new `MemberRole` enum) and
   `User.interests` (`String[]`, free-text tags — no fixed taxonomy is
   specified anywhere, so this doesn't invent one) to the existing
   self-edit profile form (`/profile/[id]/edit`), rather than building a
   separate multi-step post-approval wizard. `locationCity` also made
   editable there (previously set once at approval, never editable) — it's
   now one of the three fields the profile-complete REP bonus checks.
6. **No external links in posts** — a literal, specified rule (not a future
   feature) — added simple URL-pattern validation to `POST`/`PATCH
   /api/posts`.

**Explicitly NOT done this pass — needs real external accounts or more
design, tracked in `TECH_DEBT.md`/`BACKLOG.md`:**
- Phone/Google/Apple sign-in (needs Supabase provider configuration + real
  OAuth app credentials).
- Any payment processing — crypto wallets, Segpay/Epoch/CCBill merchant
  accounts, escrow logic (needs real business accounts; also the single
  highest-compliance-risk item in the whole spec).
- Algorithmic Feed (For You/Following, ranking) — still a plain
  reverse-chronological list.
- Video posts (≤60s) — no video storage/transcoding infrastructure exists.
- A real Shop product catalog — Standard/Premium/Extra Premium are tier
  *concepts* in the source docs, not actual SKUs/prices/images to seed.

## Consequences

- Anyone reading old `DECISIONS.md`/`CHANGELOG.md`/`ADR` entries that say
  "Member", "Senior Member", "Mentor", "Council Member", "rating",
  "influence", or `/content` is reading **historical, not current** state —
  those entries are intentionally left unedited (this project's own rule:
  don't rewrite past ADR/DECISIONS entries) but are now superseded by this
  ADR wherever they conflict.
- `docs/Vision.md`, `docs/UX.md`, `docs/Architecture.md`, and the `API/*.md`
  pages are updated in this same pass to reflect the new names/model — see
  `CHANGELOG.md`'s `v0.7.0` entry for the full file list.
- No real user data exists yet, so this migration required no data backfill
  — the rename is purely schema + code. If this same conflict surfaced
  *after* a real Supabase project had live users, it would need an actual
  migration script (recompute REP retroactively from `RepHistory`-equivalent
  events, or accept a one-time reset to 0) — worth remembering if `CLAUDE.md`
  changes shape again post-launch.
