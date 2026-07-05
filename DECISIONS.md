# Decisions Log

A chronological record of product and engineering decisions — accepted,
replaced, or deprecated — with the reasoning behind each. This is the
project's historical memory: **add new entries at the bottom, in date
order. Never delete or rewrite a past entry** — if a decision changes,
add a new entry that says so and mark the old one superseded.

For deep technical rationale (options considered, trade-offs, review
conditions) behind a specific technical decision, see the linked ADR. This
log also covers decisions an ADR wouldn't (product/process choices,
account/access blockers, scope calls).

---

### 2026-07-01 — Read the source doc package before writing any code

Confirmed the 6-file strategic package (`CLAUDE.md`, `PRODUCT.md`,
`ARCHITECTURE.md`, `DESIGN.md`, `CONTENT_SYSTEM.md`, `ROADMAP.md`) existed
in iCloud (not the initially-expected local folder) and read all of it
before starting, per `CLAUDE.md`'s own rule #1. **Status: standing
practice** — every session should do this before touching product logic.

### 2026-07-01 — Pin Next.js 14 + Tailwind CSS v3, not "latest"

`create-next-app@latest` resolves to Next 15 + Tailwind v4, whose config
format is incompatible with `DESIGN.md`'s documented v3-syntax config.
Presented as an explicit choice to Max: framework freshness vs. spec
fidelity. **Max chose spec fidelity.** Full rationale:
[ADR-0001](docs/ADR/0001-pin-nextjs-14-tailwind-v3.md).

### 2026-07-01 — Defer the Vercel deploy to Max; build and prepare everything else

Claude Code cannot log into Max's Vercel account. Presented as a choice;
**Max chose "build + prep, I'll deploy."** Applies to Supabase and Resend
too, as those needs arose. **Status: still blocking** — see
`TECH_DEBT.md`.

### 2026-07-01 — Pin Prisma to v6, not v7

Same category of problem as the Next/Tailwind pin: Prisma 7 removed
`url`/`directUrl` from `schema.prisma`, breaking `ARCHITECTURE.md`'s
documented schema shape. Decided independently (not asked of Max — a pure
technical-compatibility call, not a product trade-off). Full rationale:
[ADR-0002](docs/ADR/0002-pin-prisma-v6.md).

### 2026-07-01 — Landing page at `app/(landing)/page.tsx`, per the documented folder plan

Resolved a route conflict between the `create-next-app` scaffold default
(`app/page.tsx`) and `ARCHITECTURE.md`'s documented route-group structure
by following the documented structure. Full rationale:
[ADR-0006](docs/ADR/0006-landing-route-placement.md).

### 2026-07-01 — Extend the `Waitlist` schema with `age`/`city`/`source`

`DESIGN.md`'s application form collects fields `ARCHITECTURE.md`'s
minimal Stage-1 table doesn't have columns for. Extended the table rather
than silently dropping submitted data (age is a compliance signal). Full
rationale: [ADR-0004](docs/ADR/0004-extend-waitlist-schema.md).

### 2026-07-01 — Landing page set to `robots: noindex` (later superseded)

Defensive Week 1 default, no specific justification beyond general
caution. **Superseded 2026-07-02** — see below.

### 2026-07-02 — Wire real waitlist persistence + confirmation email

`/api/waitlist` moved from validate-only to actually writing to the
database (idempotent on duplicate email, `503` if the database is
unreachable) and sending a Resend confirmation email (best-effort, never
fails the request). Established the API conventions later formalized in
[ADR-0005](docs/ADR/0005-api-conventions.md).

### 2026-07-02 — Adopted framer-motion for scroll-reveal animation (same-day, superseded)

First implementation of `DESIGN.md`'s fadeInUp scroll reveals used
framer-motion, per `ARCHITECTURE.md`'s stated animation library. **Superseded
same day** once measured against real performance data — see next entry.

### 2026-07-02 — Removed framer-motion from the landing page

A real Lighthouse audit measured the framer-motion implementation at
1,240ms Total Blocking Time and a Performance score of 66/100. Replaced
with a plain IntersectionObserver + CSS-transition implementation with
identical visual behavior and near-zero JS cost. framer-motion stays
installed for future authenticated Platform pages. Full rationale, with
measurements: [ADR-0003](docs/ADR/0003-remove-framer-motion-from-landing.md).

### 2026-07-02 — Landing page flipped to indexable (supersedes the 2026-07-01 noindex default)

`noindex` directly contradicted `ROADMAP.md`'s Week 3 SEO goal and the
landing's entire stated purpose (be found via search/social to grow the
waitlist, per `CONTENT_SYSTEM.md`). Flipped to `index: true, follow: true`,
scoped to the public landing route only — the future authenticated
platform stays gated by auth, not robots meta. Full rationale:
[ADR-0007](docs/ADR/0007-landing-page-indexable.md).

### 2026-07-02 — Vercel Analytics chosen over Google Analytics

`ROADMAP.md` offered either as acceptable. Google Analytics needs Max to
create a GA4 property first (another account-creation blocker); Vercel
Analytics activates automatically on the Vercel deploy Max already needs
to do. Full rationale: [ADR-0008](docs/ADR/0008-vercel-analytics-over-ga.md).

### 2026-07-02 — Fixed WCAG contrast failures without touching brand tokens

A real accessibility audit found footer/disclaimer text at 2.86:1
contrast (fails WCAG AA's 4.5:1). Fixed by pointing those specific
elements at the already-approved `--color-text-secondary` token instead of
lightening the locked `--color-text-muted` brand token. Full rationale:
[ADR-0009](docs/ADR/0009-fix-contrast-without-changing-tokens.md).

### 2026-07-02 — Adopted the full engineering documentation framework (this document, ADRs, CHANGELOG, TECH_DEBT, BACKLOG, `/docs`)

Explicit direction from Max: the project moves from "building pages" to
"building a long-term software platform." Introduced Architecture
Decision Records, this decisions log, a Keep-a-Changelog-format
`CHANGELOG.md`, `TECH_DEBT.md`, `BACKLOG.md`, and the `/docs` tree
(`Vision.md`, `Philosophy.md`, `Architecture.md`, `UX.md`, `UI.md`,
`API/`, `ADR/`). Established the rule that documentation is the single
source of truth — implementation conflicting with documentation means
stop and ask, never silently resolve either direction.

### 2026-07-02 — Switched from week-based to version-based work tracking

Per Max's direction: stop organizing work primarily by calendar week
(`ROADMAP.md`'s original framing); organize by product version instead
(`v0.1` = Landing, `v0.2` = Authentication, `v0.3` = Profile, `v0.4` =
Community, `v0.5` = Reputation, ...; `v1.0` = the January 2027 public
launch per `ROADMAP.md`). Everything built through this date is
retroactively declared **`v0.1.0`** in `CHANGELOG.md`. `ROADMAP.md`
itself is unchanged (Max's external planning document, outside this repo)
— this is how work gets tracked *inside* the repo (`BACKLOG.md`,
`CHANGELOG.md`, commit messages) from here forward.

### 2026-07-02 — Middleware must degrade gracefully without Supabase credentials too (caught before commit)

The first `middleware.ts` implementation called `createServerClient()`
unconditionally on every request. Since `NEXT_PUBLIC_SUPABASE_URL` is
still a placeholder (Supabase isn't provisioned — see `TECH_DEBT.md`),
this threw on **every single request**, including the already-shipped
public landing page — not just the new protected routes. Caught by
testing `curl http://localhost:3000/` before committing, not by
assumption. Fixed by checking for the env vars up front in both
`middleware.ts` and `lib/auth/session.ts#getCurrentUser()`, treating
"Supabase not configured" as "not logged in" (fail closed on protected
routes, pass through untouched everywhere else) — the same defensive
pattern already used for Resend (`v0.1`) and the waitlist DB write, just
initially missed for middleware specifically because it runs on *every*
request, not just one feature's API route. **Lesson for future
integrations that touch middleware or root layout: the "degrade
gracefully without real credentials" rule applies there first**, since a
crash at that layer takes down pages that have nothing to do with the
feature being added.

### 2026-07-02 — Authentication strategy: Supabase Auth (resolves the previously-pending entry)

`ARCHITECTURE.md` names NextAuth v5, Clerk, *and* implicitly Supabase Auth
(bundled into its "DB Hosting: Supabase... + Auth..." line) across two
different sections — a real doc ambiguity, not a clean either/or.
Presented to Max as an explicit three-way choice. **Max chose Supabase
Auth** — reuses the Supabase project already required for the database,
adds no new vendor account (unlike Clerk), and pairs naturally with the
Row Level Security work `ARCHITECTURE.md` §9 already requires (unlike a
from-scratch NextAuth setup). Full rationale:
[ADR-0010](docs/ADR/0010-supabase-auth.md).

### 2026-07-02 — Added `isAdmin` to `User` and status tracking to `Waitlist`

Building the admin approval API surfaced two more schema gaps in the same
category as the earlier `Waitlist` field extension
([ADR-0004](docs/ADR/0004-extend-waitlist-schema.md)): `ARCHITECTURE.md`'s
`User` table has no admin/non-admin distinction despite its own documented
`/api/admin/*` endpoints, and its `Waitlist` table has no status column
despite `PRODUCT.md` §1 explicitly specifying three application statuses
by name. Both added as minimal, documented, additive fields — not invented
scope, filling gaps the source docs left between them. Full rationale:
[ADR-0011](docs/ADR/0011-isadmin-field.md),
[ADR-0012](docs/ADR/0012-waitlist-status-tracking.md).

### 2026-07-02 — Simplified Initiation Ritual: approval grants Level I directly

`PRODUCT.md` §1 Stage 2 specifies a 5-step mandatory Initiation Ritual
(profile, Code of Conduct, intro material, self-introduction, safety
rules) between application approval and receiving Level I access. This
ritual is **not built in `v0.2`** — approving an application currently
grants Level I and `active` status immediately, with no ritual gate. This
is a deliberate, documented scope simplification for `v0.2` (which
`BACKLOG.md` scopes as "Authentication," not "Onboarding"), not a
decision to drop the ritual from the product — it's expected to land when
`v0.3`'s Hall UI exists to host it. Flagged explicitly rather than left
as a silent gap; see `TECH_DEBT.md` and `docs/UX.md`'s implementation
status table.

### 2026-07-02 — `v0.3` (The Hall) started; moved Next→Now on Max's "продолжай"

Per `BACKLOG.md`'s own rule ("items only move between Now/Next/Later with
Max's approval"), starting `v0.3` work required that approval — given via
Max's plain "continue" after this session reported `v0.2` complete and
asked whether to proceed. Logged explicitly so the rule's application is
traceable, not just followed silently.

### 2026-07-02 — Initiation Ritual steps 2/3/5 also deferred, not just step 4

Building the real `v0.3` ritual surfaced that step 4
([ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md)) wasn't
the only step with no real content behind it — steps 2 (Code of Conduct),
3 (Lord Obsidian's introduction), and 5 (safety/respect rules) all need
actual policy or narrative text that doesn't exist in any of the six
source documents. Writing that content myself would mean inventing real
community-conduct rules for an adult platform — flagged to Max rather
than guessed at. **Max chose**: build the framework and a fully real
step 1 (profile completion, computed live from actual data, not a
self-reported checkbox), and show steps 2/3/4/5 as honest "pending
content" placeholders — no fake "I agree" checkboxes for policy text
nobody has written. Ritual completion is satisfied once every step is
either genuinely done or explicitly deferred (same pattern
[ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md) already
established for step 4).

### 2026-07-02 — Real referral resolution wired into the approval flow

`PRODUCT.md` §6's "Trust Chain" was documented (`docs/UX.md`) but never
actually implemented — the Waitlist form's `referralCode` field was
free text with no connection to a real inviting member. `v0.3` resolves
it for real: on approval, if the applicant's entered code matches an
existing member's actual `referralCode`, a `Referral` row is created
(`status: joined`) and the inviter's `referralCount` increments. No
schema change needed — the `Referral` model already existed, unused,
from the original Week 1 schema pass.

### 2026-07-02 — Progress-to-next-level shows no fabricated activity metrics

`PRODUCT.md` §2's Level II/III requirements mix quantified criteria
(reputation stars) with unquantified ones ("steady activity," "high
activity," "content or event contribution" — no source doc defines how
to measure these). `lib/rating/level-progress.ts` computes real
checkmarks only for the quantified criteria; unquantified ones render as
plain requirement text with no invented progress number or fake
checkmark. Consistent with the same principle behind the ritual-content
decision above: real data or an honest "not tracked," never a
fabricated metric.

### 2026-07-03 — `v0.4` (Community / Rooms) started on Max's "продолжай"

Same precedent as `v0.3`'s start: `BACKLOG.md`'s move-only-with-approval
rule satisfied by Max's plain "continue" after `v0.3` was reported
complete.

### 2026-07-03 — Only structurally-documented rooms get seeded; no invented thematic topics

`CLAUDE.md` §7 documents general rooms, thematic rooms, and named local
circles (SF/LA/Miami/NY/Berlin/London/Tokyo) as categories — but only the
local circles have concrete names anywhere in the source docs.
"Thematic rooms" is never given specific topic names. Seeding invented
thematic room topics (e.g. guessing at specific kink/practice categories
for an adult community platform) would be the same category of problem
as writing Initiation Ritual content myself — presuming real community
content decisions that aren't mine to make.

**Resolution:** `prisma/seed.ts` creates only what's explicitly named or
structurally implied by the `RoomType` enum: one `general` room, one
`newcomers` room, and the 7 named `local` circles. **No thematic rooms
are seeded.** Room creation is added to the admin panel
(`POST /api/admin/rooms`) so Max/admins can create thematic rooms with
real topics as the community actually needs them — mechanism built,
content left to a human. Didn't ask Max to confirm this one (unlike the
ritual content gap) since it's a conservative default with no downside:
building the creation mechanism and seeding nothing invented is strictly
safer than guessing at topics, and normal admin discretion is exactly the
kind of decision `docs/API/admin.md`-style tooling exists to enable.

### 2026-07-04 — `v0.5` (Reputation) started on Max's "продолжай"

Same precedent as `v0.3`/`v0.4`. Unlike those, this version's core
mechanic — the rating formula — is fully quantified in `ARCHITECTURE.md`
§5 (exact weights: reputation 30, activity 20, achievements 15, referral
quality 20, events 10, content 5; Trust Score deltas: +10/-20/-50), so
this version doesn't carry the same "content doesn't exist" risk the
Ritual and thematic rooms did.

### 2026-07-04 — Initiation Ritual step 4 made real, closing ADR-0013's own review trigger

ADR-0013 (2026-07-02) explicitly flagged "revisit when Rooms ship" as
the condition for turning step 4 (introduce yourself in the newcomers'
room) from a deferred placeholder into a real check. Rooms shipped in
`v0.4`; while extending the rating engine in `v0.5`, updated
`getRitualStatus()` to check real `Message` history in the `newcomers`
room instead. Didn't require re-confirming with Max the way steps 2/3/5
still do, since this is a mechanical data check, not new invented
content. Surfaced a new risk in doing so: the newcomers' room's 30-day
access window (`lib/rating/room-access.ts`) could permanently lock out
anyone who doesn't complete step 4 in time — not fixed, tracked in
`TECH_DEBT.md` as a genuine product question (grace period? exception
for ritual-incomplete members?), not something to default silently.

### 2026-07-04 — Major strategic pivot: OC_MASTER.md discovered, adopted as source of truth

Max pointed back at the iCloud docs folder; `files.zip` (new that day)
contained `OC_MASTER.md` and a revised `CLAUDE.md`, both self-declaring
*"the single source of truth for Obsidian Club."* Investigating
revealed the folder actually holds three separate, conflicting document
lineages (original 6-file package + a precursor architecture doc;
2026-06-27 drafts — TZ, Codex, UserJourney Onboarding, and a "Master
v2.docx" synthesizing them; and this new `files.zip` pair) — not just
one update. Stopped and asked rather than guessing which was current,
given the stakes (potentially invalidating five shipped versions). Full
reasoning: [ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md).

**Max's answers, in order:**
1. Between `OC_MASTER.md` and `Obsidian Club Master v2.docx` (the two
   documents that both call themselves authoritative and directly
   conflict on iOS/Android, entry model, rating weights, and tech
   stack) — **`OC_MASTER.md` wins.**
2. Given `OC_MASTER.md` says nothing about implementation technology —
   **keep the existing Next.js/Prisma/Supabase build, Hall, Rooms, and
   reputation engine as the foundation.** `OC_MASTER.md`'s new elements
   (purchase/referral entry paths, the physical-goods/marketplace/
   courses/mental-health ecosystem, subscription tiers) are additive
   future scope, not an immediate rebuild. The existing waitlist/
   admin-approval flow is now understood as `OC_MASTER.md`'s own
   "Path 3 — Manual Review (First 1000)," not a system being replaced.

**Not yet resolved, flagged for a future conversation, not decided
here:** whether `Obsidian Codex.docx`'s actual prose (club philosophy,
six rules, "The Club's Promise") can be reused as real content for the
Initiation Ritual's still-unresolved steps 2/5
([ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md)) — the
text itself doesn't depend on Lineage B's Circle/Warden hierarchy or
purchase-verification model, but it was authored as part of that
now-superseded package, so reusing it is a distinct question from
adopting the system it shipped alongside.

### 2026-07-04 — Clarification: the other drafts were idea-processing, not a competing spec

Max clarified directly: `TZ v1`, `Codex`, `Master v2.docx`,
`UserJourney Onboarding`, and the other brand/narrative PDFs in the
iCloud folder were brainstorming/idea-processing drafts — never
intended to compete for authority. `OC_MASTER.md` + the revised
`CLAUDE.md` are the deliberate output of a working session between Max
and Claude (strategic planning) specifically to produce instructions
for Claude Code. Doesn't change the decision above, simplifies the
mental model going forward — see
[ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md)'s
2026-07-04 addendum.

### 2026-07-04 — `v0.6` (Content & Achievements) started on Max's "продолжай"

Same precedent as `v0.3`-`v0.5`. Confirmed this scope isn't superseded
by the `OC_MASTER.md` pivot — its Phase 1 "App MVP" priority explicitly
includes a feed. Re-read `PRODUCT.md` §7-§10, §13 directly before
building rather than relying on memory from earlier in the session,
since this is Lineage A content (still valid) that needed precise
numbers (content-creation rights by level, achievement names) — found
one thing worth correcting: articles are Mentor+(4)/Master+(5)/Council
only, not "Level II+" as loosely paraphrased in `docs/UX.md` earlier.
Also surfaced a real, previously-unnoticed gap: `getLevelProgress()`
(`v0.3`) only ever *displayed* progress toward the next level — nothing
actually promoted a member's `User.level` when criteria were met. Fixed
as part of this version.

### 2026-07-04 — `v0.6` shipped: two implementation choices worth recording

1. **Rating engine's `content` component (`ARCHITECTURE.md` §5) is now
   real**, having been an honest zero through `v0.4`. Counted only
   curated types (`article`/`lecture`/`course`/`manifesto`), deliberately
   excluding plain `post`/`story` — those already feed the `activity`
   component's post count, and double-counting the same post under both
   buckets would have inflated rating for ordinary feed activity beyond
   what `ARCHITECTURE.md` §5's weight split intends. 2 points per
   curated piece, capped at the documented 5-point weight, is this
   session's default (source doc names the bucket, not the curve) — same
   pattern as `activity`/`achievements`/`referralQuality` already are.
2. **`checkLevelUp()` only promotes on real criteria** (reputation,
   referral count, has-published-content) and silently skips "steady/
   high activity" rather than blocking promotion on it — since no source
   doc quantifies that criterion (see `TECH_DEBT.md`, pre-existing gap).
   This means a member can be auto-promoted without literally satisfying
   every documented requirement. Judged the lesser risk versus the
   alternative (nobody ever gets auto-promoted, since an unmeasurable
   criterion could never evaluate to `true`) — flagged, not hidden.

Also caught in this pass: root `README.md`'s "Current version" line had
been stuck at `v0.1.0` since the very first version — never updated
across `v0.2`-`v0.5`'s doc-sync steps. Fixed to `v0.6.0`; worth a beat of
attention in future version-close-out passes.

### 2026-07-04 — New visual identity material (`Визуал/` folder): used the safe parts, flagged the rest

Max added a `Визуал/` subfolder to the iCloud docs folder: two brand
identity guide sheets (logo/symbolism/palette/materials/values) and a
Lord Obsidian character spec (a fixed reference face, appearance rules,
personality, a full Midjourney prompt, and real generated reference
portraits), asked to "use it."

**Done without asking** (safe, additive, non-destructive to the locked
brand — filling in detail the original `CLAUDE.md` left abstract, not
changing anything already decided):
- Wrote [docs/LordObsidian.md](docs/LordObsidian.md) — the durable,
  text-form record of the persona spec, since the source images
  themselves aren't committed to the repo.
- Confirmed the guide's color palette (deep black / dark burgundy /
  silver / gold / platinum) **exactly matches** this codebase's existing
  CSS tokens — no changes needed, a validation rather than a correction.
- Added the spear glyph to `components/ui/Logo.tsx` (the axis symbol
  between O and C) — a new detail the guide specifies that the original
  one-line `CLAUDE.md` brand description didn't include.
- Added the "POWER. DISCIPLINE. TRUST." tagline to the Landing hero.

**Deliberately not done** — flagged instead of guessed: the guide
includes real, consistent reference *portraits* of Lord Obsidian (a
specific generated human face used across many settings). Which
portrait, if any, should become a live, user-facing asset, and where
(Landing's "Lord Obsidian" card? `/ritual`? approval emails "from Lord
Obsidian"?) is a real brand/product decision — not something to
unilaterally pick for a "locked" recurring character on an adult
platform. Also noted: one source image includes background art not
appropriate to publish as a directly web-accessible asset if it were
ever dropped into `public/` — flagged in `TECH_DEBT.md` as a reason to
be deliberate about what lands there. Neither the portraits nor the
brand-guide infographics themselves were copied into the repo (large
binaries; the durable content is captured in `LordObsidian.md` instead).
No version bump for this pass — small, cross-cutting, not tied to a
`ROADMAP.md` milestone.

### 2026-07-04 (later same day) — Both flagged items resolved

Asked Max the deliberately-not-decided portrait question via
`AskUserQuestion`; answer: "Да, подключить." Wired the library-armchair/
cigar/cane portrait into the Landing's "Lord Obsidian" card as
`public/brand/lord-obsidian.jpg` (cropped + compressed from
`Визуал/C3BA0C0F-...png` — chosen over the other portraits because it's
the pose both identity-guide sheets already use as "the" hero shot, and
it has no background elements). The NSFW-adjacent variant
(`4D812A56-...png`) was excluded, per the flag raised earlier.

Separately, Max pointed out a specific image in the identity guide
(`Визуал/C733A838-...png`) as "there's a photo with a clear/precise logo
you need to use" — cropped just the monogram lockup from it and replaced
`components/ui/Logo.tsx`'s hand-drawn SVG entirely with that real image
(`public/brand/oc-monogram.webp`). This is a **raster crop of a
photographed mockup**, not a true vector export — closes the "hand-drawn
approximation" gap `TECH_DEBT.md` had flagged, but doesn't close the
underlying "need a real vector asset" item, which still stands for any
future need to scale the mark losslessly (print, large format) or derive
a simplified icon-scale version for `ogIcon.tsx`/`opengraph-image.tsx`.

### 2026-07-05 — Expanded CLAUDE.md: full replacement, live migration (not a future-scope layer)

Max shared a substantially expanded `CLAUDE.md` — Layer 1/2 reputation
model (Title + REP point ledger), a 5-tab nav structure, OAuth/phone
registration + role/interest onboarding, and a full Shop & Payments
section (crypto primary, adult-friendly card processors secondary,
escrow). Read it, confirmed understanding, and reported back the
concrete conflicts with what's already live — level names, the
reputation formula, nav labels — since this doc doesn't just add future
scope like `OC_MASTER.md` did ([ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md)),
it contradicts things already computing real numbers for users today.

Asked directly: full replacement (migrate) or a v2 vision layered on an
unchanged MVP? Answer: **"Полная замена, мигрируем."**

Executed in this pass — full detail and rationale in
[ADR-0015](docs/ADR/0015-claude-md-v2-full-replacement.md):
- Level names renamed everywhere (Initiate/Keeper/Steward/Warden/Master/
  Council), centralized into `lib/rating/levels.ts` (previously
  duplicated in three files — worth doing regardless of the rename).
- Reputation model replaced: `rating-engine.ts`'s weighted formula →
  `rep-engine.ts`'s discrete point ledger (`User.rating`→`rep`,
  `RatingHistory`→`RepHistory`, `User.influence` dropped — no equivalent
  in the new model). Wired the REP triggers that are mechanically real
  today (profile complete, verification passed, first community intro,
  daily-login streaks, invited-member/invitee-Level-II/invitee-90-days);
  recorded the rest of `CLAUDE.md`'s earn/lose table in code
  (`REP_TABLE`) marked `wired: false` with the specific missing feature
  named, rather than silently dropping the numbers.
- Navigation restructured: `/content` split into `/feed` + `/library`,
  `/shop` added as an honest placeholder, bottom nav relabeled
  Feed/Shop/Community/Library/Profile.
- Onboarding role (`MemberRole` enum) + free-text interest tags added to
  the existing profile self-edit form (no fixed interest taxonomy exists
  anywhere in the source docs, so a free-text tag input doesn't invent
  one) — chose this over building a separate post-approval wizard, since
  nothing in scope needed a multi-step flow yet.
- "No external links in posts" — a literal specified rule, not future
  scope — added as real validation on post create/edit.

Deliberately not touched — real accounts or more design needed first,
tracked in `TECH_DEBT.md`: phone/Google/Apple sign-in, all of Shop &
Payments (crypto, card processors, escrow), algorithmic Feed ranking,
video posts. Because no real Supabase project/user data exists yet (see
`TECH_DEBT.md`'s "Now" blockers), the `User.rating`→`rep` and
`RatingHistory`→`RepHistory` renames needed no data migration — worth
remembering this option disappears once real users exist.

No version bump for the planning/decision itself; the migration work is
tracked as `v0.7` in `BACKLOG.md`.
