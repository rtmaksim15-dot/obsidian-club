# Backlog

Organized by product version, not calendar week (see
[docs/README.md](docs/README.md#versioning)). `v0.1`-`v0.5`'s
version → feature-area mapping is derived directly from `ROADMAP.md`'s
original Stage 2 plan. **As of 2026-07-04, `OC_MASTER.md` is the
strategic source of truth** ([ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md))
— it adds real new scope (see "Later" below), and one item it explicitly
decided (no native iOS/Android) removes scope `ROADMAP.md` previously
had. **As of 2026-07-05, an expanded `CLAUDE.md` further supersedes
`PRODUCT.md`/`ARCHITECTURE.md`'s level names, reputation model, and
navigation structure specifically** ([ADR-0015](docs/ADR/0015-claude-md-v2-full-replacement.md))
— this one required live migration, not just new scope on top, since it
conflicts with mechanics that were already built.

**Rule: items only move between Now / Next / Later with Max's approval.**
This file records what's planned, not a queue anyone can reshuffle
unilaterally.

## Now

*What's actively in progress or immediately blocking.*

- [ ] Vercel project + deploy `v0.1.0` (blocked — needs Max's account, see
      `TECH_DEBT.md`)
- [x] ~~Supabase project + Auth connection~~ — resolved 2026-07-05: Max
      provided the project URL + publishable/secret API keys, wired into
      `.env.local`. Verified live against the real project (Auth
      settings + admin users list both responded correctly, 0 users —
      fresh project). See `DECISIONS.md`.
- [x] ~~`DATABASE_URL`/`DIRECT_URL` — real Postgres connection~~ —
      resolved 2026-07-05: Max provided the database password and the
      correct session-pooler connection string (`aws-1-us-east-2`; the
      project's direct `db.<ref>.supabase.co` host only resolves via
      IPv6, unreachable from this environment, so the session pooler —
      port `5432`, supports DDL unlike the transaction-mode `6543` — is
      used for both `DATABASE_URL` and `DIRECT_URL`). Ran `npx prisma db
      push`: all 17 models are now real tables in the live database. Ran
      `npx prisma db seed`: 9 starter rooms created. Verified a real
      write round-trip (`POST /api/waitlist` → confirmed via direct
      Prisma query → cleaned up the test row). See `DECISIONS.md`.
- [x] ~~Run `npx prisma db seed`~~ — done above, 9 rooms (`general`,
      `newcomers`, 7 local circles).
- [ ] Enable Realtime on the `messages` table in the Supabase dashboard
      (one-time manual step, not a migration — needed for `/rooms/[slug]`
      chat to actually push live updates)
- [x] ~~Set at least one real `User.isAdmin = true`~~ — resolved
      2026-07-06: approved the real waitlist application for
      `lord.obsidian.oc@gmail.com` (submitted through the actual landing
      page form — name "Lord Obsidian", San Francisco) directly via a
      one-off script replicating `PATCH /api/admin/applications/:id`'s
      approve logic exactly (no admin existed yet to call the real
      endpoint with — a genuine bootstrap chicken-and-egg case), with
      `isAdmin: true` and `role: dominant` added per Max's request. Real
      Supabase Auth user created via `generateLink()`; `User`/
      `UserProfile`/`Notification` rows, REP's `verificationPassed`
      bonus, and the waitlist status flip all wrote successfully. Level
      left at 1 (Initiate) — not asked to change, so not invented. See
      `DECISIONS.md`.
- [ ] Resend account + verified sending domain + real `RESEND_API_KEY`
      (blocked — needs Max's account)
- [ ] Uploadthing account + real `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID`
      (blocked — needs Max's account; needed to verify avatar upload)
- [ ] Set `NEXT_PUBLIC_APP_URL` in Vercel once the domain is live (see
      `TECH_DEBT.md`)
- [ ] **Max to provide real content** for Initiation Ritual steps 2/3/5:
      Code of Conduct text, Lord Obsidian's introductory material,
      safety/respect guidelines (see `TECH_DEBT.md`) — blocks the ritual
      from being real, not just technical wiring
- [ ] **Open question, not decided:** can `Obsidian Codex.docx`'s actual
      prose (real, on-brand Code of Conduct + rules text) be reused for
      the item above? The text itself doesn't depend on the
      Circle/Warden hierarchy it shipped alongside, but that hierarchy
      was superseded — see `DECISIONS.md`, 2026-07-04.
- [x] ~~Reconcile `OC_MASTER.md` pivot with existing build~~ — resolved
      2026-07-04: existing foundation kept, new scope added as "Later"
      below. See [ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md).
- [x] ~~Which Lord Obsidian reference portrait (if any) becomes a real
      user-facing image, and where~~ — resolved 2026-07-04: Max confirmed
      "Да, подключить"; the library-armchair/cigar/cane portrait is now
      on the Landing's "Lord Obsidian" card
      (`public/brand/lord-obsidian.jpg`). See `DECISIONS.md`,
      `docs/LordObsidian.md`.
- [x] ~~Google OAuth~~ — resolved 2026-07-06: Max provided a real
      Client ID/Secret and enabled the provider in the Supabase
      dashboard himself; `app/auth/callback/route.ts` + a "Continue
      with Google" button on `/login` are wired and confirmed reachable
      (`/auth/v1/authorize?provider=google` correctly redirects to
      Google). See `TECH_DEBT.md`.
- [ ] Apple OAuth + phone sign-in (needs Max's Apple Developer account/
      Services ID, plus an SMS provider account for phone auth — see
      `TECH_DEBT.md`)
- [ ] Shop & Payments — real product catalog, crypto payment gateway,
      an adult-friendly card-processor merchant account (Segpay/Epoch/
      CCBill), escrow design. Needs its own planning pass with Max before
      any code — see `TECH_DEBT.md` (flagged as the single
      highest-effort, highest-compliance-risk item in `CLAUDE.md`)

## Next

*`v0.2` and `v0.3` are functionally complete (code-wise) — verification
blocked on the same Supabase/Resend/Uploadthing accounts listed in "Now"
above.*

### v0.2 — Authentication ✅ (built 2026-07-02, unverified end-to-end)

(Source: `ROADMAP.md`, August Weeks 1–2)

- [x] Decide auth strategy — **Supabase Auth**, confirmed by Max
      2026-07-02. See [ADR-0010](docs/ADR/0010-supabase-auth.md).
- [x] Registration / login flow — `/login` (Supabase email/password);
      there's no open self-registration, matching `PRODUCT.md`'s
      approval-gated model (see `docs/API/admin.md`).
- [x] Admin panel v1 — `/admin/applications` + the approve/decline API.
      See [ADR-0011](docs/ADR/0011-isadmin-field.md),
      [ADR-0012](docs/ADR/0012-waitlist-status-tracking.md).
- [x] Basic member profile — `/profile/[id]`, real data, no tabs yet
      (deferred to `v0.3`).
- [x] Avatar upload — wired (uploadthing), unverified without real keys.
- [x] Level system live in the database — approval sets Level I directly;
      **the Initiation Ritual gate is simplified/deferred**, see
      `TECH_DEBT.md`.
- [x] Hall (`/hall`) route — minimal status view; full UI is `v0.3`.

### v0.3 — The Hall ✅ (built 2026-07-02/03, unverified end-to-end)

(Source: `ROADMAP.md`, August Weeks 3–4)

- [x] Full Hall UI — avatar, level, reputation/rating/influence/Trust
      Score, real data throughout.
- [x] Progress-to-next-level — real criteria for Levels I→II/II→III;
      Mentor+ correctly shown as appointed, not earned (`PRODUCT.md` §2).
- [x] Referral link generation + stats — **and real resolution wired
      into approval** (creates `Referral` rows, increments
      `referralCount` — this mechanic existed in the schema since Week 1
      but was never actually connected until now).
- [x] Basic notifications — real `Notification` rows, created on
      approval, shown on `/hall`.
- [x] Mobile bottom navigation (`DESIGN.md` §8) — plus "coming soon"
      placeholders for Rooms/Content/Events so the nav doesn't dead-end
      before those versions ship.
- [x] Initiation Ritual — framework + a fully real step 1; **steps 2/3/5
      need Max to write actual content** (Code of Conduct, Lord
      Obsidian's intro, safety rules), step 4 needs Rooms (`v0.4`). See
      "Now" above and `TECH_DEBT.md`.
- [x] Profile self-edit — `/profile/[id]/edit`, self-only, moved avatar
      upload here from `/hall`.

### v0.4 — Community / Rooms ✅ (built 2026-07-03, unverified end-to-end)

(Source: `ROADMAP.md`, September Weeks 1–2)

- [x] Room list/types — `/rooms`, real data, locked rooms shown with a
      lock (`DESIGN.md`), grouped by type.
- [x] Real-time chat — `/rooms/[slug]`, Supabase Realtime on the
      `messages` table. **Requires enabling Realtime on that table in
      the Supabase dashboard once the project exists** — see
      `TECH_DEBT.md`.
- [x] Level-gated access — `lib/rating/room-access.ts`, enforced
      server-side on every route, not just hidden in the UI.
- [x] Newcomers' room — real 30-day window from `PRODUCT.md` §1, not
      just a level check.
- [x] First local circles — the 7 named cities from `CLAUDE.md` §7,
      seeded via `prisma/seed.ts`.
- [x] **No thematic rooms seeded** — none are named in any source doc;
      `POST /api/admin/rooms` lets admins create them with real topics.
      See `DECISIONS.md`, 2026-07-03.
- Not built: presence ("who's online"), message pagination beyond the
  latest 50, message edit/delete — see `TECH_DEBT.md`.

### v0.5 — Reputation ✅ (built 2026-07-04, unverified end-to-end)

(Source: `ROADMAP.md`, September Weeks 3–4)

- [x] Star ratings / peer reviews — `POST /api/users/:id/review`
      (`docs/API/reviews.md`), a form on `/profile/[id]`; reputation is a
      real average of received reviews.
- [x] Rating engine + weighting — `lib/rating/rating-engine.ts`
      implements `ARCHITECTURE.md` §5's exact weights; underspecified
      curves (activity, achievements) are documented defaults, not
      literal spec. `events`/`content` components are honest zeros.
- [x] Rating history log — real `RatingHistory` rows, shown on `/hall`.
- [x] Referral "Trust Chain" — the `+10` Trust Score bonus for referrals
      reaching `active` (30+ days) is real
      (`lib/rating/referral-lifecycle.ts`). The `-20`/`-50` deltas for
      invitee warnings/removals aren't wired — no moderation surface
      exists yet to trigger them. See `TECH_DEBT.md`.
- [x] **Bonus**: Initiation Ritual step 4 (introduce yourself in the
      newcomers' room) is now real, closing
      [ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md)'s own
      review trigger now that Rooms exist. Surfaced a new risk: the
      newcomers' room's 30-day window could permanently lock a member
      out if they don't post in time — see `TECH_DEBT.md`.

### v0.6 — Content & Achievements ✅ (built 2026-07-04, unverified end-to-end)

(Source: `ROADMAP.md`, October Weeks 1–2). Confirmed by
[ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md) as
still-valid near-term scope — `OC_MASTER.md`'s Phase 1 "App MVP" includes
a feed, so this wasn't superseded by the pivot.

- [x] Content feed + library — `/content`, real feed (posts/stories) and
      library (articles/lectures/courses/manifestos), level-gated reads.
      See [API/posts.md](docs/API/posts.md).
- [x] Creation rights by level — `lib/rating/content-rights.ts`,
      `PRODUCT.md` §10's exact table, enforced server-side.
- [x] Likes — real `Like` join table, toggle endpoint, `Post.likesCount`
      kept in sync.
- [x] Level auto-promotion (I→II, II→III) — `lib/rating/level-progression.ts#checkLevelUp()`,
      real for the criteria that have a real metric; "steady/high
      activity" still can't gate it (see `TECH_DEBT.md`).
- [x] Achievements — `level-up-2`, `level-up-3`, `first-post`,
      `first-reputation-star` added and wired to real triggers, joining
      `initiation-complete` (`v0.3`).
- [x] Rating engine's `content` component is real (was an honest zero
      in `v0.5`) — curated content only, disjoint from `activity`'s post
      count.
- Not built: comment API/UI (`Comment` model exists, unused — see
  `TECH_DEBT.md`), post media upload, draft/unpublish workflow, feed
  pagination beyond 20, progressive (non-initiation) rituals/tasks —
  `PRODUCT.md` doesn't specify what those are yet.

### v0.7 — CLAUDE.md v2 Migration ✅ (built 2026-07-05, unverified end-to-end)

**Inserted ahead of the original `ROADMAP.md` sequence** — not sourced
from `ROADMAP.md` like `v0.1`-`v0.6`, but from the expanded `CLAUDE.md`
Max shared 2026-07-05 ([ADR-0015](docs/ADR/0015-claude-md-v2-full-replacement.md)).
Every version from here down is renumbered up by one from the original
plan (old `v0.7`→`v0.8`, `v0.8`→`v0.9`, `v0.9`→`v1.0`, `v1.0`→`v1.1`) to
make room — see each section below for its original name.

- [x] Level renaming — Initiate/Keeper/Steward/Warden/Master/Council,
      centralized in `lib/rating/levels.ts`.
- [x] REP reputation model — `lib/rating/rep-engine.ts` replaces the
      weighted `rating-engine.ts`; `User.rep` (was `rating`) is a
      discrete point ledger, `RepHistory` (was `RatingHistory`).
      `User.influence` dropped (no equivalent in the new model). Wired:
      profile-complete, verification-passed, first-community-intro,
      daily-login + 7/30-day streaks, invited-new-member,
      invitee-reached-Level-II, invitee-active-90-days. The rest of
      `CLAUDE.md`'s earn/lose table is recorded but not wireable yet —
      see `TECH_DEBT.md`.
- [x] Navigation restructure — `/feed` + `/library` (split from
      `/content`, which now redirects to `/feed`), `/shop` placeholder
      added, bottom nav relabeled Feed/Shop/Community/Library/Profile.
- [x] Onboarding — `User.role` (`MemberRole` enum) and free-text
      `User.interests` added to the profile self-edit form;
      `locationCity` made editable there too.
- [x] "No external links in posts" — real validation on post create/edit.
- Not built (needs real accounts or more design — see `TECH_DEBT.md`):
  Google/Apple/phone sign-in, Shop & Payments (crypto, card processor,
  escrow), algorithmic Feed ranking, video posts.

### v0.8 — Houses, Vault & Profile ✅ (built 2026-07-08/09, unverified end-to-end)

**Inserted ahead of the `ROADMAP.md` sequence again**, sourced from the
restored `CLAUDE.md` (2026-07-08). Every version from here down is
renumbered up by one again (old `v0.8` Events & Marketplace → `v0.9`, ...).

- [x] Fixed the Google OAuth registration gap — a first-time sign-in
      with no matching member creates a pending `Waitlist` application
      (`/apply?status=pending`) instead of a dead end.
- [x] Houses System — `House` model, `houseId` on `Room`/`Post`, House
      of Rope (Phase 1) seeded with a linked room and its first two real
      articles ("What Is Shibari?", "Getting Started in House of
      Rope"). `/houses` + `/houses/[slug]` built. See
      [ADR-0016](docs/ADR/0016-houses-system.md).
- [x] The Vault fully replaces Shop — `/shop` deleted, `/vault`
      placeholder added, bottom nav updated.
- [x] `/profile` — a stable, ID-less redirect to the caller's own
      `/profile/[id]`; REP now displays there alongside reputation stars.

### v0.9 — Vault Mechanic, House Content UI & Apple Sign-In ✅ (built 2026-07-09, unverified end-to-end)

- [x] Real Vault mechanic — `VaultItem` model (`minRep`-gated, no
      price), `/vault` shows real items locked/unlocked by `user.rep`,
      `POST /api/admin/vault-items` for Max to add real ones. No
      catalog invented — honestly empty until items exist.
- [x] House content-tagging UI — `ContentComposer.tsx` gained a house
      picker; `POST /api/posts` validates the optional `houseId`.
      Members can tag their own posts to House of Rope directly, not
      just via `prisma/seed.ts`.
- [x] Apple Sign-In UI — button on `/login`, reuses the existing
      provider-agnostic `/auth/callback` as-is. Gated behind
      `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` (default `false`) — not
      clickable until Max configures real Apple Developer credentials
      in the Supabase dashboard (full steps in `TECH_DEBT.md`).
- Not built: `MarketplaceItem` retirement decision, Signature Rope
  Collection, phone sign-in.

### v0.13 — REP System Completion + The Vault ✅ (built 2026-07-16)

- [x] REP event history on `/profile/[id]` (owner-only) — reason,
      source, date, signed delta, alongside the already-displayed total.
- [x] New REP sources: House join (+10, real `HouseMembership`, once
      per house), first post ever (+5), post tagged to a house (+2,
      daily cap 10). `invitedNewMember` changed 300 → 15 per Max's call
      — see DECISIONS.md.
- [x] Admin REP adjustment — `/admin/rep`, +/- with a required reason,
      logged as `source: "admin-adjustment"`.
- [x] Vault redesigned as a grid — image placeholder, exact "Unlocks at
      N REP" copy, disabled "Claim" CTA on unlocked items (no
      redemption backend yet). Seeded 3 explicitly-named test items
      (10/50/150 REP) to exercise the gating logic end-to-end.
- Not built: real Vault artwork/catalog (still Max's call), Claim
  redemption/fulfillment flow.

### v0.14 — Feed & Posts MVP ✅ (built 2026-07-17)

- [x] Post photos — single optional image, Supabase Storage
      (`post-photos` bucket), 8MB limit.
- [x] Real comments — `GET`/`POST /api/posts/:id/comments`, flat list,
      no nesting.
- [x] Post detail page (`/posts/[id]`) — full post + all comments; feed
      cards' comment count links here.
- [x] REP badge + house tag + photo on every post card (shared
      `PostCard`, used by `/feed`, `/library`, `/posts/[id]`).
- [x] Feed scoped to global posts + houses the caller has joined (not
      every active house); house-tagging now requires real membership,
      enforced server-side.
- Not built: multiple photos per post, video, threaded/nested comments.

## Later

*Intentionally postponed — approved direction, not yet scheduled in
detail. Derived from `ROADMAP.md`'s existing Stage 2 plan (renumbered up
by two to make room for `v0.8`/`v0.9` above — see that section).*

### v1.0 — Events & Marketplace (originally `v0.7`, then `v0.8`)

(Source: `ROADMAP.md`, October Weeks 3–4) — events (list + detail +
registration, level/Trust-Score gating), admin panel v2, basic
marketplace vitrine.

### v1.1 — Beta Hardening (originally `v0.8`, then `v0.9`)

(Source: `ROADMAP.md`, November) — closed beta (20–50 members from the
waitlist), load testing, security audit (RLS, rate limiting — see
`TECH_DEBT.md`), Stripe integration, PWA finalization (offline, push
notifications — see `TECH_DEBT.md`'s service-worker gap).

### v1.2 — Launch Preparation (originally `v0.9`, then `v1.0`)

(Source: `ROADMAP.md`, December) — final QA, first invitation wave,
branded error pages (404/500), onboarding/Initiation Ritual flow,
monitoring (Sentry).

### v1.3 — Public Launch (originally `v1.0`, then `v1.1`)

(Source: `ROADMAP.md`, January 2027) — first wave of 100–200 members.

### Unscheduled ideas (post-`v1.3`, per `ROADMAP.md`)

- `v1.4` — full Marketplace (the merch/tickets vitrine from `ARCHITECTURE.md`
  §12 — a smaller scope than `OC_MASTER.md`'s marketplace vertical below;
  originally `v1.1`, then `v1.2` before this round's insertion)
- ~~iOS app~~ / ~~Android app~~ — **cancelled.**
  `OC_MASTER.md` explicitly decided PWA-only, no native apps, ever (App
  Store/Google Play policy risk for 18+ content). See
  [ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md).
- `v2.0` — Desktop + scaling

### New scope from `OC_MASTER.md` (2026-07-04) — needs real specification before any of this is buildable

Added per [ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md).
None of this has enough detail to implement yet — `OC_MASTER.md` gives
strategic bullet points, not a data model, payment flow, or API design.
Each needs its own planning pass (and likely its own ADR) before code,
the same way Rooms/Reputation got planned before being built. **Do not
start any of this from guesswork.**

- **Purchase-triggered entry (Path 1)** — needs: a product catalog, an
  order-verification mechanism linking a purchase to an invite, and a
  decision on whether this reuses `Waitlist`/`User` or needs new models.
- **Direct member-referral entry (Path 2)** — an invite that skips admin
  review entirely, distinct from the existing reviewed-application flow
  (`v0.1`/`v0.2`). Needs a decision on abuse/spam limits.
- **Physical products e-commerce** — Standard/Premium/Extra Premium
  tiers, the latter $20k-$100k (platinum/gold/diamond). Needs: product
  data model, high-value payment handling, shipping/fulfillment,
  inventory — a materially different scope than the existing
  `MarketplaceItem` model (built for merch/tickets, not luxury goods).
- **Practitioner services marketplace** — sessions, coaching, bookable
  events with commission. `ARCHITECTURE.md`'s original marketplace scope
  (merch/tickets/digital) doesn't cover service *bookings* or commission
  splitting — needs real design (Stripe Connect was named in the
  original `ARCHITECTURE.md` but never implemented).
- **Courses / education** — beginner (~$50) and advanced content,
  authored by vetted experts. Needs a real course/lesson data model —
  `Post`/content models don't support structured, sequential courses.
- **Books & media commission sales** — another storefront vertical.
- **Mental health & wellness marketplace** — therapist/psychologist
  booking + crisis resources. **Needs real care before any
  implementation** — licensing verification, liability, and crisis-
  resource accuracy are not things to build from a bullet point; this
  is the single highest-stakes item on this list.
- **Subscription tiers** (Free / ~$20-30 / ~$50 / product-subscription)
  — no billing/tiering infrastructure exists in the codebase at all yet.
- **AI-first moderation + reporting** — `User.report()`, an AI
  violation-detection layer, and community-moderator roles recruited
  from top-rated members. Currently zero moderation surface exists
  beyond admin approve/decline.
