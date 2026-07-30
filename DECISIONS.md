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

### 2026-07-05 (later) — First real Supabase credentials connected: Auth works, DB still doesn't

Max provided a real Supabase project's URL and both API keys
(`sb_publishable_...`, `sb_secret_...` — Supabase's newer key format,
drop-in compatible with `@supabase/supabase-js` 2.110.0's `anon`/
`service_role` usage). Wired into `.env.local` — **not** `.env`, which
is git-committed and already pushed to the public GitHub repo; putting
real secrets there would have leaked them. `.env` correctly stays
placeholder-only per its own header comment.

Verified the connection for real rather than just trusting the values
were accepted:
- `GET /auth/v1/settings` with the publishable key returned real project
  config (email auth enabled, no OAuth providers configured) — confirms
  the URL + publishable key are valid and reachable.
- `GET /auth/v1/admin/users` with the secret key returned `200` with an
  empty user list — confirms the secret key has real admin-level access
  (exactly what `lib/auth/supabase-admin.ts#createAdminClient()` needs
  for the approval flow's `generateLink()` call), and that this is a
  genuinely fresh project (0 users), not a stale/wrong one.
- Started the dev server: `/login` renders cleanly, and `fetch('/hall')`
  (unauthenticated) now gets a real redirect from `middleware.ts`'s
  actual Supabase `getUser()` call — no crash, no fallback-to-"not
  configured" path anymore. Confirms Auth is live end-to-end at the
  request layer.

**What's still missing, and why this isn't "done":** the API keys don't
include the Postgres database password — a separate credential
(Supabase dashboard → Project Settings → Database → Connection string).
`DATABASE_URL`/`DIRECT_URL` are still the committed `.env` placeholder
(`localhost:5432`). Confirmed broken with `npx prisma db pull` (`P1001`,
can't reach `localhost:5432`) rather than assuming — this means every
page/route that calls Prisma (which is nearly all of them, past the
auth check) still fails. `BACKLOG.md`'s "Now" and `TECH_DEBT.md` updated
to reflect: Supabase Auth blocker is resolved, a new specifically-scoped
"need the DB password" blocker replaces the old generic "need a Supabase
project" one.

### 2026-07-05 (later still) — Database connected, schema pushed, real write verified

Max provided the Postgres database password. Couldn't construct a
working connection string from that alone: the project's direct host
(`db.fsleaavvmvlpvfsevosw.supabase.co`) only resolves via IPv6 (checked
with `dig` — no `A` record, only `AAAA`), and this environment has no
IPv6 egress, so it's unreachable regardless of credentials. The
IPv4-reachable alternative — Supabase's regional connection pooler
(`aws-N-<region>.pooler.supabase.com`) — requires knowing the project's
AWS region, which isn't exposed anywhere queryable (not in DNS, not in
API response headers, not derivable from the new-format API keys since
they aren't JWTs). Brute-forced 17 common regions via `prisma db pull`
(distinguishing "tenant not found" — wrong region — from other errors)
before giving up and asking Max to copy the exact string from the
dashboard rather than keep guessing.

Max returned with `aws-1-us-east-2` (note: `aws-1`, not `aws-0` — I'd
tried `aws-0-us-east-2` during the brute-force pass and gotten a
different, connection-level error, not "tenant not found," which in
hindsight was a clue the numbering matters, not just the region).

Set `DATABASE_URL`/`DIRECT_URL` in `.env.local` to the same session-pooler
string (port `5432`, not the transaction-mode `6543` — session mode
supports DDL/migrations, which `db push` needs). Both point at the same
URL since there's no separately-reachable direct connection from here.

**Discovered along the way:** the Prisma CLI only auto-loads `.env`, not
`.env.local` (Next.js's own dev/build process handles `.env.local`
fine, but the standalone `prisma` command doesn't) — every
`db push`/`db pull`/`db seed` invocation needed
`set -a && source .env.local && set +a &&` prefixed, or it silently
fell back to `.env`'s committed placeholder and failed against
`localhost:5432`. Documented in `TECH_DEBT.md` so this doesn't have to
be rediscovered.

Ran `npx prisma db push` (succeeded on the second attempt — the first
hit a transient network failure, same pattern as the earlier GitHub
push that also needed a retry; this sandbox's network appears
intermittently flaky, not a credentials problem) — all 17 models are
now real tables. Ran `npx prisma db seed` — 9 starter rooms created.
**Verified with an actual write, not just a successful CLI command:**
`POST /api/waitlist` against the running dev server returned `201`,
confirmed the row existed via a direct Prisma query, then deleted it
(it was a synthetic connectivity-check row, not real data).

`BACKLOG.md`/`TECH_DEBT.md`/`docs/Architecture.md` updated: the database
blocker is resolved. Remaining Supabase-side item: enabling Realtime on
the `messages` table is still a manual dashboard step `db push` doesn't
touch. No real members exist yet — the database is live and empty of
users, waiting on an actual application to go through `/login` +
admin approval.

### 2026-07-06 — First real member: bootstrap admin account (Lord Obsidian)

Max asked to approve the real waitlist application for
`lord.obsidian.oc@gmail.com` — already sitting in the live database as a
genuine submission through the landing page's own form (name "Lord
Obsidian," age 46, San Francisco, source "I built it"), not something I
created — with `isAdmin: true` and `role: dominant`.

**The real approval endpoint (`PATCH /api/admin/applications/:id`)
requires an existing admin to call it** (`requireAdmin()`) — and there
were zero admins in the database. A genuine bootstrap chicken-and-egg
case, not a shortcut: wrote a one-off script (run once via `tsx`, not
committed to the repo) that replicates the endpoint's approve branch
line-for-line — same Supabase Auth `generateLink()` invite call, same
`User`/`UserProfile`/`Notification` transaction, same
`verificationPassed` REP award — with exactly two additions:
`isAdmin: true` and `role: "dominant"`. `reviewedBy` was set to the new
user's own id (known upfront, since Supabase generates the auth user id
before the Prisma transaction runs) rather than left null, since there
was no other admin id to attribute the review to — a self-approved
bootstrap account, which is the honest description of what a "first
admin, created because none existed" really is.

Did **not** invent anything beyond what was asked: level stayed at 1
(Initiate) — PRODUCT.md's level system is earned/appointed, and nothing
in the request said to grant a level, so none was granted just because
this happens to be an admin account. `isAdmin` and `level` are
deliberately separate concepts in this schema (see
[ADR-0011](docs/ADR/0011-isadmin-field.md)) — being staff doesn't imply
being Council.

Verified: real Supabase Auth user created (got back a genuine invite
`action_link` — no email sent since `RESEND_API_KEY` still isn't set,
same documented no-op-safely pattern as everywhere else); `User` row
confirmed via direct query (`isAdmin: true`, `role: "dominant"`,
`status: "active"`, `rep: 200`); waitlist entry confirmed `approved`.
Max then repeated the exact same request in a follow-up message —
checked current state before doing anything, confirmed the account
already existed exactly as specified, and reported that back rather
than re-running the creation script (which would have failed anyway,
since the waitlist entry is no longer `pending`).

### 2026-07-06 — Real Supabase connection, first admin account, GitHub, Google Sign-In

Max connected the project to real infrastructure across several
requests: (1) a real Supabase project (URL + publishable/secret keys) —
wired into `.env.local`, not `.env` (the latter is committed and already
pushed to GitHub, so real secrets never go there — flagged this
explicitly since the literal request said ".env"). (2) The Postgres
password — constructing `DATABASE_URL`/`DIRECT_URL` required finding the
right connection string: the direct `db.<ref>.supabase.co` host resolves
IPv6-only (unreachable from this environment), and the pooler host
needs the correct AWS region, which isn't discoverable from the project
URL/keys/DNS — tried 17 common regions via `prisma db pull`'s
distinguishable "tenant not found" error, all failed; asked Max to pull
the real connection string from the dashboard instead of continuing to
guess. He returned with `aws-1-us-east-2` (my brute-force had only tried
`aws-0-us-east-2`) — `prisma db push` then succeeded, creating every
table in the real database. (3) GitHub: pushed to
`rtmaksim15-dot/obsidian-club`; the repo wasn't empty (GitHub's own
default README from creation) — merged histories
(`--allow-unrelated-histories -X ours`) rather than force-pushing over
it. Used a one-time Personal Access Token for the push only, never
stored in `.git/config`; told Max to rotate it since it was pasted in
plaintext chat. (4) Approved the real waitlist application for
`lord.obsidian.oc@gmail.com` (submitted through the actual landing page
— name "Lord Obsidian", San Francisco) as the project's first admin
account (`isAdmin: true`, `role: dominant`, per Max's request) — via a
one-off script replicating `PATCH /api/admin/applications/:id`'s
approve logic exactly, since no admin existed yet to call the real
endpoint with (a genuine bootstrap chicken-and-egg case, not a shortcut
around the real flow). (5) Google Sign-In: Max provided a real OAuth
Client ID/Secret and had already enabled the provider in the Supabase
dashboard himself by the time the code was verified — confirmed via a
direct `GET /auth/v1/authorize?provider=google` request correctly
redirecting to Google's consent screen with the right client ID.
Built `app/auth/callback/route.ts` (PKCE exchange) and the "Continue
with Google" button on `/login`. The Google credentials themselves
never touch this app's code/env — Supabase's own dashboard holds them;
our code only calls `signInWithOAuth`.

Bumped to `v0.7.1` — infrastructure-connection milestone, not a new
feature version.

### 2026-07-08/09 — Houses System, House of Rope content, Vault mechanic, Apple Sign-In UI

Read the restored `CLAUDE.md` (a third generation of the file, found at
the iCloud folder root). Verified two of its claims directly against
the live database rather than trusting them: Realtime was confirmed
genuinely enabled on `messages`/`notifications`/`posts`/`rooms`; Google
OAuth "works" was only half true — a real session was established
(`auth.users` had a genuine `rtmaksim15@gmail.com` row with a populated
`last_sign_in_at`), but that user had no matching `public.users` row, so
the app still treated them as logged out. Asked Max directly how an
unrecognized Google sign-in should behave in a closed, no-open-registration
club — confirmed: create a pending application, same as the landing
page's waitlist form.

Built the Houses System (`House` model, House of Rope as Phase 1, real
content — a general shibari/kinbaku overview and a safety-first
"getting started" orientation, deliberately not actual tie-technique
instructions) and, once Max confirmed "The Vault полностью заменяет
Shop," a real Vault mechanic (`VaultItem`, REP-gated, no price) plus a
house content-tagging UI in `ContentComposer.tsx`. Apple Sign-In UI was
built reusing the same provider-agnostic OAuth callback Google already
proved out, but kept behind `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` since
Apple credentials don't exist yet — a real visitor seeing a
guaranteed-to-fail button would be a live bug, not just an internal gap.

Full rationale in [ADR-0016](docs/ADR/0016-houses-system.md). Bumped to
`v0.9.0`.

### 2026-07-13 — Recovered lost commits: a fresh clone was missing everything after v0.7.1

Starting work on Vercel deployment prep, discovered the working
directory was a **fresh clone** of the GitHub repo, and `origin/main`
was still at `v0.7.1` — none of the work described above (the Google
OAuth registration-gap fix, Houses System, House of Rope content, Vault
mechanic, house-tagging UI, Apple Sign-In UI, `/profile` REP display)
had ever been pushed. It only existed in a previous sandbox session's
local git history, which was discarded without a push. The real
Supabase database was unaffected (confirmed House of Rope, the admin
account, and the two seeded articles all survived — only the *code*
was gone, not the data).

Reconstructed every file from this session's own record of what was
written, re-validated the schema against the (already-correct) live
database, re-ran `prisma db seed` (idempotent — no duplicates), and
committed + **pushed** this time. Lesson for future sessions: commit
alone isn't durable across a sandbox reset — push after every
meaningful unit of work, not just at explicit "push this" requests.

### 2026-07-13 — Landing Page redesign: reconciling the handoff against the live schema

Max supplied an agency-approved design handoff (`design_handoff_obsidian_
club_landing/`) with a literal task list that said to insert applications
into an "`applications`" table with columns `(name, reason,
invitation_code, created_at)`. No such table exists — the club's single
application-intake table is `Waitlist` (mapped `waitlist`), which the
handoff's own README explicitly says to reuse ("wire to `POST
/api/waitlist`... the existing `WaitlistForm` component already does
this"). Cross-checked the handoff's actual form fields against
`Waitlist`'s columns: `name`/`email`/`age`/`city`/`source` already
existed; the design's "Invitation code" field already maps to the
existing `referralCode` column. Only "Why you belong here" was genuinely
new — added as `Waitlist.reason`. Treated the task list's "applications"
naming as informal shorthand (it mirrors `/api/admin/applications`'s URL,
which already reads from `Waitlist`), not an instruction to fork a second
table.

Found and fixed a real vulnerability while verifying RLS per the task
list: `waitlist` had **RLS disabled entirely**, not just "missing an
anon-insert policy" as asked. Since `NEXT_PUBLIC_SUPABASE_ANON_KEY` is
public or in the browser bundle, anyone could have called Supabase's
REST API directly and dumped every applicant's name/email/age/city —
independent of the app's own Prisma-based write path, which never
touched RLS at all (its `DATABASE_URL` role has `BYPASSRLS`). Enabled
RLS and scoped the policy to `INSERT`-only for `anon`; verified the
Prisma path still writes successfully.

Asked Max how the hero's email-only quick-capture should behave, since
wiring it to `/api/waitlist` unchanged would 422 (the API requires a
name and 18+ age — a deliberate compliance check, not incidental
validation) and the design prototype's own success state for it is
purely client-side with no real backend. Max decided: the hero never
submits on its own — clicking "Request Invitation" scrolls to the real
application form at `#apply` and carries the typed email down with it.
The 18+ gate stays intact on the one path that actually creates a
`Waitlist` row.

Bumped to `v0.10.0`.

### 2026-07-14 — Real logo everywhere, and a small-favicon tradeoff

Max flagged the landing page's OC monogram (nav, footer, Principles grid,
Apply header) as a "hand-drawn vector approximation" — correct: it was an
inline SVG (circle + arc + rotated square) I'd built as a stand-in, not
the real brand mark. Deleted `components/ui/Monogram.tsx` entirely.

Cropped the monogram out of the design package's `oc-logo.jpg` (rows
99–555, cols 220–895) and cut out its background via an alpha matte
(distance from the sampled background color, not a hand-traced mask) —
saved as `public/images/logo-mark.png`, used by the new
`components/ui/LogoMark.tsx`. One inherent limitation surfaced during
this: the source render shows the "black" O only via specular
highlights against a black backdrop — there's no separate flat-black
fill baked into the pixels. Alpha-matting it necessarily keeps only
those highlight pixels, so the cutout **only reads correctly on a
near-black background** (verified against this site's actual `#0A0908`/
`#111009` — matches the source almost exactly); on a lighter background
the "black" ring would look like a thin bright ring instead. Not a
mistake in the extraction — there's no hidden data to recover — so this
is a real constraint on where `LogoMark` can be used, not just here.

While auditing "every instance" per Max's instruction, found two more
placeholder-logo spots that had never been on anyone's radar as
"the same bug": `lib/utils/ogIcon.tsx` (PWA `icon-192`/`icon-512`) and
`app/(landing)/opengraph-image.tsx` (social share card) were both
drawing plain "O"/"C" text via `next/og` — literally commented
"Placeholder until a real vector asset is supplied." And
`app/favicon.ico` was still the unmodified `create-next-app` default
(the Vercel triangle), not even a placeholder attempt. Fixed all three:
deleted `ogIcon.tsx` and the two dynamic icon routes, replaced with
static `public/icons/icon-192.png`/`icon-512.png` generated once from
the real cutout; `opengraph-image.tsx` now embeds the real
`public/images/logo.png` lockup; `favicon.ico` regenerated from the same
source.

The favicon needed one more real-asset-only adjustment: at 16–48px the
thin double-line O all but disappears (too little "ink" per pixel at
that scale for a naive resize). Rather than redraw a bolder shape —
which Max explicitly ruled out — applied a brightness/contrast boost to
the same cutout's pixels (a levels adjustment, not a redraw) for the
favicon variant only; the 192/512 PWA icons and every on-page use keep
the faithful, unboosted cutout. Still subtle at 16px, flagged in
TECH_DEBT.md as something a dedicated small-icon mark from Max would
improve, but not a shape invented from scratch.

### 2026-07-15 — Google OAuth verified end-to-end; Initiation Ritual steps 2/3 are real

**OAuth test.** Max added `lord.obsidian.oc@gmail.com` as a test user in
the (unverified/Testing) Google Cloud OAuth consent screen, then signed
in through `/login`'s "Continue with Google." Verified directly against
the database rather than trusting the redirect alone: Supabase Auth
linked the new Google identity to the *same* existing `auth.users.id`
(this email was already the bootstrapped admin — `auth.identities`
gained a `provider: google` row against the unchanged user id, no
duplicate `waitlist` entry was created). Landed on `/ritual`, not `/hall`
— correct, since the initiation ritual gate is independent of the OAuth
gate, and this account had never completed it. Confirmed session
persistence and `/profile` load. The "new user → pending waitlist" path
this task also asked about only fires for emails absent from
`public.users`; this account doesn't exercise that branch, by design —
noted rather than guessed past.

**Ritual content.** Max supplied the real Code of Conduct (five laws)
and Lord Obsidian's introduction text. Built `/ritual/code-of-conduct`
and `/ritual/introduction` as real, gated steps rather than static copy
dropped into the existing "Content pending" cards — each writes genuine
per-user completion state (`UserProfile.ritualProgress`, a JSON field,
no migration needed) via a new `POST /api/ritual/progress`, restricted
to exactly these two step ids.

This forced a small but deliberate behavior change: `ritualProgress`
already stored `codeOfConduct: "deferred"` / `introMaterial: "deferred"`
for any member created before this change (from the old
`INITIAL_RITUAL_PROGRESS` — content didn't exist yet, so everything
started deferred, ADR-0013's pattern). Now that the content is real,
honoring "deferred" as a satisfying state for these two steps would mean
no one ever actually has to read/accept them. Changed
`lib/auth/ritual.ts` so `codeOfConduct`/`introMaterial` only resolve
`"done"` on a literal `true`, correctly re-surfacing any pre-existing
member as `"todo"` — consistent with the project's stance that nothing
gets silently marked complete. `safetyRules` is untouched (still no
content), and `newcomerRoom` was never affected (computed live from
message history, ignores the stored value entirely).

Verified the full loop against the same admin account used for the
OAuth test: accepted the Code, scrolled the Introduction to its end
(confirmed the `IntersectionObserver`-driven auto-completion fired,
`ritualProgress` gained `codeOfConduct: true` / `introMaterial: true`
plus ISO timestamps), then **reverted that test data** — the acceptance
was mine, driven for verification, not Max's genuine consent to a
document whose own text says "a decision on violations, if any, is
final." Left `safetyRules`/`newcomerRoom` untouched by the revert.

### 2026-07-16 — Admin application review: two real bugs, and a severe pre-existing RLS gap

Most of the admin panel Max asked for already existed (`/admin/
applications`, the approve/decline API, referral resolution, REP
bonuses — all from earlier `v0.2` work). What was actually missing
against this task's spec: the `reason` field wasn't displayed, there was
no confirm dialog before Approve/Decline (both final per the Code of
Conduct's own text), and `requireAdmin()` failures redirected to `/hall`
instead of 404ing — a redirect confirms "there's an admin panel you
can't see," which is exactly the discoverability the task asked to
close. Fixed all three (`app/(platform)/admin/applications/page.tsx`,
`components/shared/ApplicationsQueue.tsx`).

**Hydration bug found during testing, not asked for, fixed anyway**:
`ApplicationsQueue`'s applied-date used `toLocaleDateString()` with no
fixed locale — harmless when server and browser locale happen to agree,
but this sandbox's server defaults to `en-US` while the browser's
`navigator.language` is `ru`, so the server rendered "7/16/2026" and the
client immediately re-rendered "16.07.2026," and React discarded the
whole server-rendered tree over it. Pinned both to `en-US`/UTC.

**The severe finding**: the task's own framing ("RLS-enforced") prompted
checking RLS status directly against the database rather than trusting
that requireAdmin()'s `isAdmin` check was the whole story. It queried
`pg_class.relrowsecurity` across every `public` table:

```
select c.relname, c.relrowsecurity from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
```

Result: **RLS is enabled on `waitlist` only** (fixed 2026-07-14, see this
file's earlier entry) — every other table (`users`, `messages`,
`user_profiles`, `notifications`, `rep_history`, `reviews`, `rooms`,
`posts`, `likes`, `referrals`, `houses`, `vault_items`,
`marketplace_items`, `user_achievements`) has RLS **off**. Since
`NEXT_PUBLIC_SUPABASE_ANON_KEY` ships to every browser, and Supabase's
PostgREST layer exposes every `public` table by default unless RLS
blocks it, anyone with devtools open could currently run e.g. `fetch(
'https://fsleaavvmvlpvfsevosw.supabase.co/rest/v1/users?select=*', {
headers: { apikey: '<anon key>' } })` and get every member's email, age,
city, and REP — or read `messages`, including whatever's posted in
supposedly-gated rooms. This is completely independent of and invisible
to this app's own access control (`requireAdmin()`, `getCurrentUser()`),
since every real code path reads through Prisma via `DATABASE_URL`,
whose role has `BYPASSRLS` — the admin panel, and everything else in
this app, would keep working perfectly even with this hole wide open,
which is exactly why it went unnoticed.

**Deliberately not fixed in this pass.** Checked whether a blanket
`ENABLE ROW LEVEL SECURITY` + deny-all-by-default would be safe, since
Prisma bypasses RLS regardless and every read in this app goes through
Prisma or a server-side Supabase Auth session — found one real
exception: `components/shared/RoomChat.tsx` subscribes to Supabase
Realtime `postgres_changes` on `messages` (`components/shared/
RoomChat.tsx`) to know when to refetch. Realtime enforces RLS itself —
it will only deliver a change notification if the subscribing role could
`SELECT` the row, so enabling RLS on `messages` with no matching policy
would silently stop live message updates (members would need to
manually refresh to see new messages), a real functional regression, not
just a theoretical one. Designing that one policy correctly, auditing
whether any other client-side Supabase call exists that a blanket
deny-all would break, and doing this across 14 tables is a proper
security-hardening pass of its own — not something to do as a rider on
an unrelated admin-panel task. Flagged prominently to Max instead of
silently fixing or silently ignoring it; see TECH_DEBT.md for the
recommended next step (enable RLS ordered by exposure severity —
`users`/`messages` first — with `messages`' SELECT policy designed
before it's flipped on).

### 2026-07-16 — REP system completion + The Vault: two product decisions asked upfront

Before writing any code, checked the task's two REP-source asks against
what's actually wired today and found real conflicts, so asked Max
directly rather than guessing:

1. **"House join +10"** — no membership concept existed at all (no
   table, no button; any member could already tag posts with a house
   without "joining" anything). Two paths existed: treat a first
   house-tagged post as an implicit join, or build a real
   `HouseMembership` model + explicit "Join House" action. Max chose the
   real membership model. Built `HouseMembership` (unique on
   `[userId, houseId]`), `POST /api/houses/:slug/join` (idempotent — a
   repeat join just confirms, never re-awards), and a button on
   `/houses/[slug]` that flips to "Member since {date}" once joined.
   Deliberately doesn't gate the room/content below it — that's still
   level-based via `canAccessRoom` — joining is a rewarded affirmative
   action, not a new access prerequisite.

2. **Referral REP conflict** — `invitedNewMember` already awards +300
   REP to the inviter on approval (wired since `v0.2`, sourced from an
   earlier, more detailed CLAUDE.md that predates this session's
   condensed version). This task asked for +15 for the same event. Max
   confirmed +15 replaces the 300, not stacks with it — changed
   `REP_TABLE.earn.invitedNewMember.points` directly, no dual-award
   logic needed.

**Verified against reality, not the task's framing, before building**:
the task said "REP sources live now: house join +10, first post +5" as
if already active. Neither was — `first-post` only granted an
achievement badge (per ADR-0015, achievements stopped carrying REP
back on 2026-07-05), and house join didn't exist as a concept at all.
Built both as genuinely new sources rather than assuming they needed no
work.

**Full loop tested on the real admin account**, since it's the only one
with working credentials in this environment: used the new `/admin/rep`
tool to drop `lord.obsidian.oc@gmail.com` from 210 REP to exactly 15,
confirmed `/vault` showed the 10-REP test item unlocked and the 50/150
ones locked with the exact "Unlocks at N REP — you have 15" copy (the
task's literal test scenario), then restored 210. Joined House of Rope
for real (confirmed `+10`, membership row, "Member since" UI), posted
6 times tagged to it in a row to confirm the daily cap (5 posts earned
REP, the 6th correctly earned none — `10 REP` total from `house-post`
that day), then deleted the test posts and reverted every REP delta
this testing introduced (`house-joined`, all `house-post` rows) back to
the pre-test 210. Net effect on the account: zero — same discipline as
the ritual-acceptance test revert (DECISIONS.md, 2026-07-15) and the
waitlist/referral revert (2026-07-16, admin panel task). The two
`admin-adjustment` REP History rows from the 15-REP Vault test
(`-195`/`+195`) were left in place — they're an honest, real record of
the admin-adjustment feature actually being exercised, not fake data,
and they net to zero.

### 2026-07-17 — Feed & Posts MVP: Supabase Storage over UploadThing, membership-gated house tagging

**Storage provider.** Avatar upload already uses UploadThing
(`app/api/uploadthing/`) — reusing it for post photos would have been
the path of least resistance. Didn't: the task named "Supabase Storage"
specifically, not "file upload" generically, and this project already
runs Auth + DB on Supabase — fewer vendors is a reasonable reason to
actually want Storage too, not just an oversight to paper over. Built
`POST /api/posts/photo` using the service-role admin client (same
pattern as `lib/auth/supabase-admin.ts`'s other privileged writes),
lazily creating a public `post-photos` bucket on first use. Verified
end-to-end: uploaded a real file, confirmed the returned public URL
actually renders in the feed, then deleted the storage object during
cleanup.

**House tagging now requires membership.** `POST /api/posts` previously
let anyone tag any active house regardless of membership — correct at
the time, since `HouseMembership` didn't exist yet (predates the REP
system task, 2026-07-16). Now that it does, this task's "dropdown
selector from user's houses" spec is a real, correct tightening: the
composer's house dropdown (on both `/feed` and `/library`, which share
`ContentComposer`) now only lists houses the caller has joined, and the
API enforces the same rule server-side (not just a client-side
convenience) — tagging a non-joined house 422s with "You can only post
to houses you've joined." Feed's own query changed the same way: it
shows global posts + posts from joined houses only, not every active
house's content.

**Verified the full loop on the real admin account**: joined House of
Rope for real, published a post there with an actual uploaded photo,
liked it, added a comment (confirmed the comment count on the card was
stale until posting a comment triggers `router.refresh()` — added that
fix), opened `/posts/[id]` and confirmed the full thread renders there,
confirmed the feed card's comment count links to that same page. Then
deleted the test post (and its Storage object), reverted the REP this
testing introduced (`house-joined` +10, `house-post` +2), and removed
the test membership — left the same day's legitimate `+5` daily-login
REP untouched (a new calendar day since the last task's testing, so a
real, non-test event).

### 2026-07-17 — Closed Registration & Invite System: replaced the approve-time account flow, didn't just extend it

The task's spec (admin approves → gets a one-time link → copies/sends
it manually → recipient sets a password on a real page → account is
created) reads, on its face, like it could be redundant with the
approve/decline flow already built (2026-07-16 entry above). It isn't.
Investigating the existing flow before writing anything turned up a
real, unfixed bug that made this a genuine fix, not busywork:

**The old flow never actually let anyone set a password.** Approving an
application called Supabase's `admin.generateLink({ type: "invite" })`,
which both creates the Auth user immediately and returns a one-time
`action_link`; that link was auto-emailed via Resend
(`sendAccessGrantedEmail`), whose copy said "set your password to enter
the club." But no page anywhere in the app ever collected a password —
Supabase's own invite-link verify endpoint just authenticates the
session and redirects. The member's one shot at the link was spent
without ever setting credentials, so they could never again log in via
email/password (only OAuth, if the same email happened to match a
Google account). This was a real dead end for anyone who used a
different email for Google than for their application — found, not
theorized, by reading `app/api/admin/applications/[id]/route.ts` and
`lib/utils/email.ts` together before writing any new code.

**Given that, replaced the flow instead of layering the new spec on top
of it.** Approval now only generates `Waitlist.inviteToken` (random 48
hex chars) and returns the resulting URL for the admin to copy — no
Supabase Auth user, no `User`/`UserProfile`/`Notification`/`Referral`/REP
rows, no email, at approval time. All of that moves to
`POST /api/invite/[token]`, which runs only once a real password has
actually been collected on `/invite/[token]`, immediately before
signing the new member in and marking the token used. This is a strict
improvement on the old flow's guarantees, not a parallel path — there
is now exactly one way an account gets created, and it always has a
password.

**"Applications" is still `Waitlist`, and `/apply` already exists — no
new form built.** Same shorthand established in every prior task this
session: the spec's "applications" table is the existing `Waitlist`
model, not a new one. The spec's requirement #1 ("landing page stays as
is") and requirement #2 (an application form with name/email/reason)
are both already satisfied by the landing page's embedded
`ApplicationForm` (name/email/age/city/source/reason → `Waitlist`,
built 2026-07-13). Building a second, separate `/apply` form page would
have fragmented that flow for no benefit — and `/apply` already exists
as a *different* real page (the post-OAuth "you need an invite, here's
your pending/no-account status" landing built during the OAuth task),
which this task doesn't touch.

**`/register` blocks this app's own route, not Supabase's raw API.**
Built `app/register/route.ts` returning 403 on GET/POST per the literal
spec, though no `/register` route or `signUp()` call existed anywhere
to begin with — nothing to remove, just an explicit door-that-was-never-
there now visibly locked. This can't be a complete fix: Supabase's
project-level Auth REST API accepts signups directly from the public
anon key regardless of what this codebase does, and the service-role
key doesn't expose a way to flip that from code — it's a
dashboard-only toggle (Authentication → Providers → Email → "Allow new
users to sign up"). Flagged in `TECH_DEBT.md` as a manual action item
for Max; this codebase has no path to closing that gap on its own.

**Verified the full loop live**, using two real test applications
against the real admin account: approved one
(`invite-test-user@example.com`), copied the resulting invite link, and
completed registration through it in a second browser tab — confirmed
the real account got created, was signed in, and landed on `/feed`;
confirmed a second `POST` to the same token returns 410 ("already been
used") and the page itself shows the same state on reload; confirmed a
nonexistent token's page shows "isn't valid." Submitted a second
application (`decline-test-user@example.com`) and confirmed Decline
still works correctly after `ApplicationsQueue`'s full rewrite (200
response, item removed from the pending list). One incidental finding
during testing: browser tabs share a single cookie jar, so completing
registration in one tab (which calls `signInWithPassword`) silently
invalidated the admin session in another tab open to the same origin —
not a bug in the app, just a fact about testing two identities in one
browser; re-authenticating the admin tab via "Continue with Google"
restored it, and `/admin/applications` correctly 404'd in the meantime
(proof the not-discoverable-to-non-admins protection from 2026-07-16
still holds). Fully reverted all test data afterward: both `Waitlist`
rows, the one real `User`/`UserProfile`/`RepHistory` row set the
completed test registration created, and its Supabase Auth user.

### 2026-07-20 — User Profiles: username-based routing, and replacing avatar upload rather than wiring it as-is

The spec asked for `/profile/[username]` and a param-less `/profile/edit`
— both a change from what already existed (`/profile/[id]`,
`/profile/[id]/edit`, built 2026-07-02/03). `username` was already a
real, unique column on `User` (set at registration), so this was a
rename with a different lookup key, not new schema. Checked every
internal link to the old paths first (`grep`, not a guess): only two
existed, both self-links to the edit page using the session's own
`user.id` (`/hall`, `/ritual`) — no code linked to `/profile/[id]`'s
*view* at all. Updated both self-links, deleted the old `[id]` folder,
and updated `/profile`'s redirect and a doc comment in
`rep-engine.ts` that referenced the old path.

**Avatar upload: replaced UploadThing, didn't wire it up as spec'd
"whatever's there."** The task's field list explicitly named "avatar
upload (Supabase Storage, same bucket pattern as post photos)" — not
ambiguous, so this wasn't a judgment call the way the invite-system
replacement (2026-07-17 entry above) was. Checked `TECH_DEBT.md` first
and confirmed the existing UploadThing flow
(`app/api/uploadthing/core.ts`, `AvatarUploadButton.tsx`) had never
actually been verified — `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID` were
always empty, so it was dead weight from the start, used nowhere else
in the codebase (`grep` confirmed). Built `POST /api/profile/avatar`
on the same lazy-bucket pattern as `app/api/posts/photo/route.ts`
(`ensureBucket` via `storage.listBuckets()`/`createBucket()`), its own
`avatars` bucket (not shared with `post-photos` — a user has exactly
one avatar, not a gallery), a fixed `userId/avatar.<ext>` path with
`upsert: true` so re-uploading replaces the old file instead of
accumulating orphans, and a `?v=<timestamp>` cache-buster on the stored
URL since a fixed path means the public URL is otherwise byte-identical
across re-uploads and a browser/CDN would keep serving the stale image.
Removed the UploadThing route, `lib/utils/uploadthing.ts`, both npm
packages (`npm uninstall`, not just deleting from `package.json`), and
the two empty env vars — nothing else referenced any of it.

**Nav/header ambiguity — asked rather than guessed.** The spec said
"clicking avatar or name in nav/header → `/profile/edit` or
`/profile/[username]`," but this app has no desktop header at all, and
the only nav (`BottomNav`, mobile-only) already has an intentional,
documented decision that its "Profile" tab points at `/hall` (the
self-view dashboard), not a profile page — see the CLAUDE.md v2
migration entry above. Wiring the new requirement without touching that
existing decision meant a real design choice (new desktop header?
repurpose the existing tab? something else?), not something to invent
silently. Asked Max directly; chose to make the avatar/name already
rendered at the top of `/hall` link out to `/profile/[username]`
(view) and repointed `/hall`'s existing "Edit profile" link at the new
`/profile/edit` — smallest change, nothing renamed, `BottomNav`
untouched.

**Scoped out deliberately: linking post authors to their profiles.**
`PostCard` (used on `/feed`, `/library`, `/posts/[id]`, and now this
profile page's "Recent Posts") doesn't currently link the author's
name/avatar anywhere, and none of the eight places that `select` a
post's `author` currently fetch `username`. Doing this properly would
touch all eight call sites for a feature not in this task's four
numbered requirements — flagged in `BACKLOG.md` as a natural fast-follow
instead of expanding scope here.

**Verified live** against the real admin account: the avatar-upload
code path end-to-end (bucket creation, real upload, public URL fetch
returning `200`/`image/png`, `User.avatarUrl` write) via a script
exercising the exact same Supabase Storage calls the route makes — a
direct HTTP request through the browser's session cookie wasn't
reliable to reconstruct outside the browser itself (Supabase's
`@supabase/ssr` chunked-cookie format), so this was the more direct
verification of the actual risk surface (real Storage + real DB write)
rather than the routing plumbing, which the framework already
type-checks. Also verified through the real UI: `/profile/edit`
loading with real prefilled data, saving a bio via the actual form
(`PATCH /api/profile` → `200`, persisted across reload, 300-char
counter live), `/profile/[username]` rendering every section correctly
for the owner (REP history, edit link) and — via a throwaway `User` row
created and deleted directly, no real Auth account needed for a
read-path check — for a non-owner (review form instead of REP
history/edit link, no posts). Confirmed a nonexistent username 404s.
Reverted every change this testing made to the real admin account
(`avatarUrl`/`bio` back to `null`) and deleted the throwaway profile
row; REP itself was never touched, confirmed unchanged at 220
before/after.

### 2026-07-26 — Analytics Phase 0: two real naming/type collisions the spec didn't anticipate, and a hard scope line at "listed in 2.5"

`SPEC-analytics-panel.md` names the new model `Event`, mapped to table
`events`, with a plain `userId String?` field and an admin RLS check on
`users.role = 'ADMIN'`. None of the three survive contact with the real
schema:

**Both the model name and the table name were already taken.** This
codebase already has a real `model Event` (`@@map("events")`) for
offline meetups (title, location, price, dress code — Events feature,
`v0.7` backlog). Adding a second model called `Event` doesn't just
warn, it's a straight `prisma validate` failure, and mapping it to the
same `events` table would have silently corrupted an unrelated,
already-populated-in-production table if validation somehow let it
through. Named the new model `AnalyticsEvent`, table `analytics_events`
— unambiguous, no collision, and the RLS SQL was adjusted to match
before ever being applied.

**`users.role` is not a permission level in this schema.** It's
`MemberRole` (dominant/submissive/switch/observer/newcomer) — the
onboarding kink-orientation field from ADR-0015, unrelated to admin
status. The actual admin flag is `User.isAdmin` → Postgres column
`is_admin`, a boolean. Applying the spec's literal RLS SQL wouldn't
have errored outright (the `role` column exists, just holds the wrong
kind of value) — it would have silently produced an admin-read policy
that matches *nobody*, since no `MemberRole` value is ever `'ADMIN'`.
That's a worse failure than a crash: it looks like it works (RLS is on,
policies exist) but the intended admin override never actually fires.
Caught by reading the real schema before writing the SQL, not by
testing after the fact.

**`userId`'s type had to change for the foreign key to be valid.**
`User.id` is `@db.Uuid`. The spec's literal `userId String?` (no native
type) would create a `text`/`varchar` column — Postgres does allow a
foreign key from a non-uuid column, so this would actually push
successfully, but every real `userId` written would need to be a UUID
string being implicitly compared against a `uuid` column in queries and
the RLS policy, which is exactly reversed from the actual type
mismatch: the *safe* fix is `userId String? @db.Uuid` so the column is
a real `uuid`, matching `User.id` exactly. That in turn means the
spec's own-row RLS policy (`auth.uid()::text = "userId"`) is now
casting the wrong direction — comparing `text` to `uuid` has no
operator in Postgres and would 500 on every read. Flipped it to
`auth.uid() = "userId"` (both `uuid`, no cast) — verified this exact
policy live (see below), not just reasoned through.

**Scope: only wired what §2.5 explicitly lists, not the full §2.2
taxonomy.** `post.reacted` (likes), `rank.changed` (level
promotion/demotion), and `profile.viewed` are real taxonomy entries
with real, findable insertion points in this codebase (`app/api/posts/
[id]/like/route.ts`, `lib/rating/level-progression.ts`) — but §2.5's
"точки внедрения" list doesn't name them, and the task's own acceptance
bar ("`track()` вызывается минимум в 10 точках **из 2.5**") is explicit
about the boundary. Wiring them anyway would have been inventing scope
beyond what was asked, not thoroughness — left alone, flagged as
available for a later pass if the spec's own list expands to cover
them.

**Two of §2.5's listed points have no code to attach to at all**,
confirmed by grep, not assumption: `vault.item_claimed` (the Claim
button is `disabled` everywhere — `title="Redemption isn't set up
yet"` — no `/api/.../claim` route exists in `app/api/`) and
`search.performed` (no search feature — no search input component, no
search API route, anywhere in `app/` or `components/`). Reported both
as "not found," not silently skipped or faked with a placeholder route
that isn't real product functionality.

**Verified end-to-end with real Supabase accounts, not just
inspection.** Created two disposable, real Auth + `public.users`
identities, seeded one event each as the service role (which correctly
bypasses RLS), then read `analytics_events` back through the
**anon-key** client signed in as each — Prisma's own connection always
uses the service role and can't exercise RLS at all, so this was the
only way to actually prove the policy. User A's unfiltered `select *`
returned exactly their own row; an explicit query for User B's `userId`
from A's session returned zero rows, not an error — confirming Postgres
RLS's actual behavior (silently filters, doesn't reject) matches the
intent. Also proved the `server-only` guarantee isn't just a comment:
built a throwaway Client Component importing `track()`, confirmed
`next build` fails with `You're importing a component that needs
server-only`, then deleted it — the real build is clean. All test
accounts, events, and the throwaway component/route were deleted
afterward; nothing from this verification pass persists.

### 2026-07-27 — Feed-first v1: REP UI deferred behind a flag, not deleted; proceeded on explicit instructions without the named roadmap file present

Max referenced `OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md` as already
added to the repo root and asked me to read it first. Checked twice
(`find`/`ls` against the actual root) — it wasn't there either time.
His own message already gave four fully explicit, self-contained
instructions (exact flag name and value, exact wrapping targets down to
"PostCard badge, hall REP section, profile REP display, admin rep
page," exact `/admin/rep` 404 behavior, exact `/vault` teaser copy
verbatim, exact push instruction) — nothing about the four tasks
themselves was ambiguous or depended on the roadmap's literal text, so
proceeded on the explicit instructions rather than blocking on a file
that doesn't exist, flagging its absence clearly instead of silently
either assuming its contents or refusing to act.

**One real judgment call, not covered by the instructions as given**:
whether `/admin/rep` should 404 for admins too, or only for non-admins
(the existing pattern). Max's instruction — "same as other admin pages
for non-admins" — read literally could mean either "same *mechanism*"
or "same *scope* (non-admins only)." Given the stated goal is that
REP-adjustment UI must not appear in v1 at all, not just be hidden from
non-admins, implemented the stricter reading: the flag check runs
before the admin check, so the page 404s unconditionally while
`REP_UI_ENABLED` is false, admin session or not.

**Copy note**: Max wrote the requested heading as "THE VAULT" (caps).
`.text-h1`'s CSS already applies `text-transform: uppercase` — checked
`app/globals.css` before writing anything — so authored it as "The
Vault" in JSX, matching how every other heading in the codebase is
written (title case in source, uppercase rendered), not as literal caps
in the markup. Renders identically to what he asked for.

**Scope discipline**: only touched rendering (and the two REP-history
DB queries that fed now-hidden sections, skipped outright rather than
fetched-and-discarded). `lib/rating/rep-engine.ts` — `REP_TABLE`,
`awardRep`, every award call site — is untouched; REP keeps
accumulating in the ledger exactly as before, just isn't drawn anywhere
in the UI. Did not additionally lock down `POST /api/admin/rep-adjustment`
itself (only the page 404s) — that endpoint is still reachable by a
direct request from an authenticated admin session; flagged in
TECH_DEBT.md rather than silently expanding scope to cover it, since
that wasn't asked for and the page being undiscoverable was.

**Verified live** against the real admin account: `/vault` renders
exactly the requested teaser (no items, no REP text); `/admin/rep`
404s even for the real admin; `/profile/[username]` shows no REP total,
no "REP History" section, and no REP badge on the Recent Posts cards
(same shared `PostCard` used on `/feed`/`/library`/`/posts/[id]`) — one
component fix covers all four surfaces at once. `/hall` wasn't
separately live-tested (it's gated behind Initiation Ritual completion,
which the real admin account doesn't have — forcing it would mean
mutating real ritual-progress state again) — relied instead on the
identical, already-proven-working `REP_UI_ENABLED` conditional pattern
plus a clean `tsc`/production build, which did catch the grid-column
arithmetic (3→2 cols) compiling correctly.

### 2026-07-27 (later) — Closed the `/api/admin/rep-adjustment` gap flagged the same day

Same-day follow-up: Max asked directly to close the TECH_DEBT.md gap
this task's own report surfaced. Added the flag check as the very first
line of the handler, before `requireAdmin()` — matching the page's own
ordering (flag check, then admin check), so an unauthenticated caller
gets 404, not 403, while the flag is off; the endpoint reveals nothing
about whether it would otherwise require admin access. Verified with a
plain unauthenticated `curl` POST (no session at all) returning `404
{"error":"Not found."}` — proof the flag check really does run first,
not just that an admin-gated 403 got relabeled.

### 2026-07-27 (later still) — Extended the deferral pattern to Houses and levels/ranks, with one explicit exception

`OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md` §V defers more than REP — it
also names Houses ("the word is temporarily removed from the
interface") and "Gold, достижения, уровни" (levels). Asked Max directly
rather than guessing, since Houses' blast radius (~7 files touched) is
considerably larger than the REP-only pass. **Max's answer**: same
pattern for both, via a new `HOUSES_UI_ENABLED`/`LEVELS_UI_ENABLED` pair
— not a reuse of `REP_UI_ENABLED`, since levels gate on
`User.reputation` (peer-review stars), a different field from
`User.rep` (see ADR-0015's REP/reputation split), and Houses is an
independent model from either. **One explicit exception carried through
every surface touched**: the Newcomers' room must stay fully
functional — it's part of the Initiation Ritual ("Introduce yourself in
the Newcomers' room"), not something the roadmap defers. Confirmed via
`prisma/seed.ts` that the Newcomers' room (`Room.type === "newcomers"`)
has zero `houseId` linkage — it's a `Room`, not a `House` — so neither
flag can accidentally touch it; also confirmed achievement grants
(`lib/utils/achievements.ts`) were never rendered anywhere in the UI to
begin with, so there was nothing to gate for that part of "Gold,
достижения, уровни."

Same shape as `REP_UI_ENABLED` throughout: gate rendering and the
otherwise-unused queries that feed it, leave earning/promotion logic
(`checkLevelUp()`, `getLevelProgress()`, `HouseMembership` writes)
running unconditionally. Houses got the fuller treatment `REP_UI_ENABLED`
gave `/admin/rep` — real route removal (teaser/redirect), not just a
hidden label — since Max's answer said "hide the Houses list/join/browse
UI" specifically, not just the word.

**Verified live**, for real, on the real admin account (which was
sitting at a fully unstarted ritual state — no prior reset needed): set
a real bio via `/profile/edit`, set a placeholder avatar directly via a
temp script (avatar-upload plumbing itself was already proven working
in the User Profiles task, so this only needed to unblock the ritual's
`profileComplete` check, not re-prove upload works), accepted the Code
of Conduct, completed Lord Obsidian's introduction, and posted a real
message in `/rooms/newcomers` — each step correctly flipped from "TO DO"
to "DONE" and redirected back to `/ritual`. Once all four actionable
steps were done, `/ritual` redirected to `/hall` on its own (the
still-`"deferred"` Safety & Respect Guidelines step doesn't block
completion — pre-existing `getRitualStatus()` behavior, unchanged).
`/hall` rendered with no REP/Levels sections and a 2-column status grid;
`/feed`'s composer (no house dropdown) published a real post rendering
cleanly via the shared `PostCard`; `/houses`, `/houses/[slug]`, and
`/vault` all showed their teasers/redirects correctly; `/rooms` showed
no "Houses →" link ("Events →" still there) while the Newcomers room
itself worked exactly as before. No console errors at any step. All
test-induced state (bio, avatar, `ritualProgress`, the test post, the
test Newcomers-room message, and the REP grant that message triggered
via `first-community-intro`) was reverted afterward via a temp script,
confirmed by re-reading the account back to its exact pre-test baseline.

### 2026-07-27 (later still) — Library deferred; asked before trimming Rooms beyond House of Rope

Max's next instruction named three things: gate `/library` behind
`LIBRARY_UI_ENABLED` (same `/vault` teaser shape), unpublish the two
seeded House of Rope articles so they don't resurface later, and hide
the `house-of-rope` room from `/rooms` "since a room named after a
deferred House is confusing." That third item's sentence ended "Only
Newcomers and Events remain visible" — read literally, that's a bigger
change than just hiding one room: `/rooms` also shows `general` and 7
Local Circle rooms today, and the roadmap's own §V defer table names
only Houses, not Rooms/General/Local Circles at all. Rather than guess
which reading was meant, asked directly. **Max confirmed the broader
reading**: deactivate `general` and all 7 Local Circles too, alongside
`house-of-rope` — for v1, only the Newcomers' room (required by the
ritual) stays visible on `/rooms`, plus the existing `Events →` link.

All three changes used existing mechanisms, no new gating code needed
beyond the Library flag: `Post.isPublished` and `Room.isActive` already
exist and are already checked everywhere real (`/rooms`, `/rooms/[slug]`,
every `/api/rooms/*` route already do `if (!room.isActive) notFound()`/
404, predating this task) — this was a pure data change for the Rooms
part. Re-running `prisma/seed.ts` won't undo either change: its
room-seeding upsert uses `update: {}` (no-op on conflict) and its
article-seeding logic skips entirely once a post with that
houseId+title already exists, regardless of `isPublished` state.

Verified live via a mobile-viewport pass (per Max's own request): Feed
worked end-to-end (composer, publish), Vault and Library both showed
their teasers, and Community showed only Newcomers + the Events link
— matching the confirmed scope exactly.

### 2026-07-29 — Diagnosed the production photo-upload bug by reproducing it, not guessing

Max reported "Could not upload photo" in production and asked to check
"logs/storage config." No direct access to Vercel's production logs
from this environment, so diagnosed by reproduction instead: uploaded
directly against the real Supabase project using the exact same
service-role client `POST /api/posts/photo` already used — bucket
existed, `public: true`, `fileSizeLimit: 8388608` (8MB), upload
succeeded instantly with no error. That ruled out Storage config,
permissions, and the bucket itself as the cause.

With Storage confirmed fine, looked at what's different between "works
in this dev sandbox" and "fails on Vercel specifically": Vercel's own
docs (fetched directly, not from memory, since platform limits change)
confirm Serverless Functions cap request/response bodies at a hard
4.5MB, independent of any app-level check — `POST /api/posts/photo`'s
own limit was a more generous 8MB, meaning real phone photos between
~4.5MB and 8MB (an entirely ordinary size for a modern phone camera
JPEG) were being rejected by the platform itself
(`FUNCTION_PAYLOAD_TOO_LARGE`) before this app's route code ever ran —
consistent with a generic-looking failure and no useful server log to
point at, since the request never reached application code.

**Fix**: switched to the standard Vercel-recommended pattern for this
exact problem — the client uploads directly to Supabase Storage via a
short-lived signed upload URL/token (`createSignedUploadUrl`/
`uploadToSignedUrl`), and the Next.js route only issues that token (a
tiny JSON exchange, nowhere near 4.5MB). The file itself never touches
the Vercel function body, so its platform cap becomes irrelevant;
Supabase's own bucket-level `fileSizeLimit` is what actually enforces
the size cap from here on. Also tightened `allowedMimeTypes` on the
bucket at creation time, since content-type validation moved from
"inspect the real uploaded file server-side" to "trust the client's
declared type before minting a token" — a real (if minor) trade-off
of this architecture change, worth a backstop at the Storage layer
itself rather than just the app's own pre-check.

**Found in passing, deliberately not fixed**: `POST /api/profile/avatar`
has the identical proxy-through-the-function shape and the same latent
exposure to the same 4.5MB cap — it just hasn't been hit yet because
avatar images people pick tend to be smaller than full camera photos.
Not fixed here since it wasn't the reported bug and touching it wasn't
asked for; flagged in TECH_DEBT.md as a clear, small, separate fix.

### 2026-07-29 — Composer simplified to post-only; moved off the feed onto its own screen

Direct instruction, not a roadmap-table-driven deferral like the
Houses/Levels/Library passes: "v1 has only posts; one text area +
photo button + Publish." Since `/library`'s real page was already a
permanent teaser (previous entry, same day) and `/feed` was the only
other real caller of `ContentComposer`, simplifying the shared
component to always submit `type: "post"` — dropping the type
dropdown, the title field, and the whole `allowedTypes` prop — left
Library's own (already-dead, teaser-gated) call site passing a prop
that no longer exists on the component. Chose to delete that dead code
outright rather than keep it "compiling but wrong," since — unlike
Houses/Vault, where the real implementation truly is intact and ready
to reactivate — Library's old composer usage would need a real rebuild
regardless (different content types, needs a title field, needs its
own type selector) whenever `LIBRARY_UI_ENABLED` flips on. Recorded as
new, real work in TECH_DEBT.md rather than pretending the flag alone
restores it.

A follow-up message arrived mid-task asking for a full Threads-style
nav/composer/feed redesign, which further reshaped this: the composer
now lives on its own screen (`/compose`), not inline on `/feed` at all,
reached from the bottom nav's new center "+" tab. Chose a dedicated
route over a modal — this codebase has no modal/dialog primitive
anywhere yet (every multi-step flow, including the Initiation Ritual,
is already a sequence of full pages), so a dedicated screen matches
established patterns instead of introducing a new one for a single use
case.

### 2026-07-29 — Extended `REP_UI_ENABLED`'s scope to cover Reputation stars and Trust Score; asked before touching Notifications

Max's framing was explicit: "the Reputation stars and Trust Score block
are visible — this is REP/reputation UI that must be behind the
disabled flags." Read this as identifying a real gap in
`REP_UI_ENABLED`'s original coverage (it only ever gated `User.rep`,
the discrete point ledger — see the 2026-07-25 REP/reputation-split
entry) rather than a request for a new, separate flag; extended the
flag's own doc comment and gated both `Reputation` (`User.reputation`
stars) and `Trust Score` under it on `/hall`, and — for consistency,
since the flag's meaning had just changed — the equivalent
Reputation-stars block on `/profile/[username]`, which had the same
gap. Login streak had no such framing (no "this belongs behind an
existing flag" cue) and no named later-reactivation story, so it was
removed outright, not flagged. The referral block ("Your Invitation")
did get its own new flag, `REFERRALS_UI_ENABLED` — Max's own words
("referrals are deferred") matched the same defer-with-a-flag shape as
every other v1 deferral this week, distinct from the core invite-only
entry mechanism (admin approval → one-time link), which ROADMAP.md §IV
explicitly keeps.

Max's enumerated "Profile shows: avatar, name, Edit profile, own
posts" read as potentially exhaustive, which would also mean removing
Notifications (not named in that list) — asked directly rather than
guess, since notifications are the only surface carrying real account
notices (e.g. "your access has been granted") and aren't named
anywhere as deferred. **Max confirmed: keep Notifications.**

Added "own posts" as a genuinely new capability on `/hall` — the
Profile tab previously had no post list of its own at all (only
`/profile/[username]` did). Reused the existing `PostList`/`PostCard`
shared components rather than building new rendering for this.

### 2026-07-30 — Client-side compression, not a bigger server-side limit, for the photo-size bug

Max reported the *next* layer of the same underlying problem: after
the signed-URL fix closed Vercel's 4.5MB gap, uploads started failing
with this app's own "Image must be 8MB or smaller" instead — real
iPhone photos commonly land well over that too. The fix he asked for
was specific: client-side compression (canvas resize to 2048px long
side, JPEG ~0.85), not simply raising the 8MB number. Raising the
number alone wouldn't have been a fix, just a bigger version of the
same problem — phone cameras keep getting higher-resolution, and every
photo uploaded at full original size costs real Storage space and
bandwidth for no visual benefit at the sizes this app actually displays
photos (a feed card, not a full-bleed print). Compression is a real
improvement regardless of the size limit, not a workaround for it.

Built one shared utility (`lib/utils/compressImage.ts`) rather than
inlining the logic separately in the composer and the avatar uploader,
since both needed identical resize/re-encode behavior — Max explicitly
asked for it applied to both. Chose `createImageBitmap` + `canvas`
(built into every browser) over a third-party HEIC-conversion library:
Max's instruction was "HEIC goes through the same pipeline," not "add
special HEIC handling" — read literally, meaning don't special-case
it, just let the same generic decode-then-redraw path run for every
file type and rely on the browser's own native decode support (Safari/
iOS has it; that's the real-world case that matters here, since the
bug report was specifically about iPhone photos).

Verified live rather than assumed: generated a synthetic 4000×3000
test image in the browser (a real File object, not a mock), ran it
through the actual composer UI, and confirmed via the rendered
`<img>`'s `naturalWidth`/`naturalHeight` that it came out at exactly
2048×1536 — proving the resize math (scale-to-long-side, preserve
aspect ratio) is correct, not just plausible-looking. Then published
it for real and confirmed both the signed-URL mint and the Storage
upload succeeded (`POST /api/posts/photo` → 201, then `POST
/api/posts` → 201), with the compressed photo rendering correctly in
the feed afterward. Cleaned up the test post and its uploaded Storage
object afterward, same as every other live-test pass this week.

### 2026-07-30 — `/rooms` redirects to the sole active room; explicitly not a flag

Max's instruction named the mechanism directly: "with only one room
live, skip the ROOMS index page... When more rooms activate later, the
index returns." That last clause is the tell that this shouldn't be a
named flag like `HOUSES_UI_ENABLED`/`LIBRARY_UI_ENABLED` — those gate a
*deferred concept* with its own later-reactivation story that needs a
human to flip a switch. This is different: it's describing behavior
that should track live data (how many rooms are actually active) on
its own, with nobody needing to remember to change anything when a
second room comes back. Implemented as a plain `rooms.length === 1`
check in `/rooms/page.tsx` before it renders anything — redirects to
that room's `/rooms/[slug]` before the "ROOMS" heading or the Events/
Houses link row ever render, and stops firing the moment a second room
is reactivated.
