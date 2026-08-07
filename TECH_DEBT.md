# Technical Debt

Known compromises, temporary implementations, and future work — recorded
here so nothing survives only in a chat transcript or someone's memory.
Each item should eventually become a `BACKLOG.md` entry once it's actually
scheduled; until then, it lives here as "known, not forgotten, not yet
prioritized."

## RLS was disabled on every table except `waitlist` — fixed 2026-08-04

**Original finding (2026-07-16)**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships
to every browser by design (it's meant to be public — RLS is what's
supposed to make that safe). RLS was only actually enabled on
`waitlist`; every other table had it off — `users`, `messages`,
`user_profiles`, `notifications`, `rep_history`, `reviews`, `rooms`,
`posts`, `likes`, `referrals`, `houses`, `vault_items`,
`marketplace_items`, `user_achievements`, plus several more added since
that first check. Concretely: anyone with the anon key could call
Supabase's auto-generated REST API directly, e.g.
`GET https://fsleaavvmvlpvfsevosw.supabase.co/rest/v1/users?select=*`,
and read every member's email, age, city, REP, private room messages —
completely invisible to and independent of this app's own access
control (`requireAdmin()`, `getCurrentUser()`, middleware route-gating),
none of which touches Postgres directly.

**Fix (August hardening pass, Block 2, 2026-08-04)**: `alter table ...
enable row level security` on every remaining table, with zero policies
(deny-all) — confirmed safe since the app's own Prisma connection role
has `BYPASSRLS`, and a full grep confirmed `RoomChat.tsx` is the only
place in the codebase using the browser-side Supabase client for direct
table access. `messages` got a real SELECT policy instead of deny-all,
since it's the one table `RoomChat.tsx` subscribes to via Realtime
(deny-all there would have silently broken live chat updates).
Migration: `supabase/migrations/20260804090000_rls_sweep_remaining_tables.sql`.

**A second, real bug surfaced while wiring `messages`' policy** — see
`components/shared/RoomChat.tsx`'s comment and DECISIONS.md
(2026-08-04) for the full trail: (1) the browser Realtime client needed
an explicit `getSession()` await before subscribing, or the websocket
opened unauthenticated and the policy (correctly) delivered nothing; (2)
Supabase Realtime's `postgres_changes` authorization does not evaluate
RLS policies that join out to other tables — a policy mirroring
`canAccessRoom()`'s exact per-room level/window logic never fired for
Realtime even though the identical predicate is true via direct SQL.
Shipped `auth.uid() is not null` instead: self-contained, and sufficient
since this policy only gates the live "something changed" ping, never
message content — `GET /api/rooms/:slug/messages` already enforces the
real `canAccessRoom()` check server-side. **Known gap, not silently
accepted**: this means the Realtime ping (not the content) is slightly
more permissive than `canAccessRoom()` — any authenticated member gets
notified of new messages in any room, though they still can't read the
content of one they can't access. Only matters once more than one room
with a real level tier is active (currently just Newcomers). Revisit if
Supabase's Realtime RLS join-authorization limitation gets fixed
upstream, or if a second gated room goes live.

**Safety net added 2026-08-06, after the exact failure mode repeated
itself within days**: `npm run check:rls` (`scripts/check-rls.ts`)
queries `pg_class.relrowsecurity` for every table in `public` and fails
loudly if any has RLS disabled. Written specifically because a schema
change can silently reintroduce this gap with no warning — and did,
almost immediately: `rate_limit_hits` (added in Block 2, the same day
as the sweep above) was never included in that migration, so it sat
with RLS off until this script's first run caught it (fixed same day,
`supabase/migrations/20260806000000_rls_rate_limit_hits.sql`). Not
wired into `postinstall`/`build` — a DB-dependent gate on every install
or build would break in environments without connectivity (fresh env
setup, some CI runs); it's a required manual step after schema changes
instead, per `CLAUDE.md` rule 8.

## Houses / Vault / Apple Sign-In gaps (2026-07-08/09, see ADR-0016)

- **8 more houses have no names yet** — CLAUDE.md says "9 more houses
  (leather, protocol, impact etc.)" as examples, not a decided list.
  Don't seed placeholder houses for these; wait for Max to name them.
- **Vault catalog is still not real** — as of 2026-07-16, `/vault` has
  3 seeded items, but they're explicitly-named test items (`"Test Item —
  10 REP"` etc., thresholds 10/50/150) for exercising the REP-gating
  logic, not real catalog content — Max still hasn't defined one.
  `VaultItem.imageUrl` exists in the schema now too, but nothing has
  real artwork — the grid renders a generic placeholder icon for every
  item today. The "Claim" CTA on unlocked items is real UI but
  deliberately disabled (`title="Redemption isn't set up yet"`) — there's
  no fulfillment/redemption backend, same honest-placeholder pattern as
  the disabled Apple Sign-In button. **Fix:** Max replaces the 3 test
  items with real ones (`POST /api/admin/vault-items`, now takes
  `imageUrl` too) and defines what "Claim" actually does before that
  button can be enabled.
- **`MarketplaceItem` vs `VaultItem`** — whether the older,
  purchase-based marketplace model gets retired in favor of the Vault is
  still an open question; Max's instruction was specifically about Shop.
- **Signature Rope Collection** — not started, no design exists yet
  (numbered/certificated limited collections, transfer registry).
- **Apple Sign-In — UI built, blocked on real credentials.** Code side
  reuses everything Google already proved works: a "Continue with
  Apple" button on `/login`, and the same provider-agnostic
  `app/auth/callback/route.ts`. **Deliberately not clickable yet** —
  gated behind `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` (default `false`),
  since Apple's provider isn't configured in Supabase and a real
  visitor clicking a guaranteed-to-fail button would be a real bug. To
  turn it on, Max needs:
  1. An Apple Developer Program membership ($99/year).
  2. A **Services ID** in the Apple Developer portal, "Sign in with
     Apple" enabled, with this app's real domain +
     `https://fsleaavvmvlpvfsevosw.supabase.co/auth/v1/callback`
     registered as the return URL.
  3. A **Sign in with Apple key** (`.p8` file) + its **Key ID** + the
     Apple **Team ID**.
  4. Enable the Apple provider in **Supabase Dashboard → Authentication
     → Providers → Apple**, using the Services ID as Client ID and the
     key/Key ID/Team ID to generate the client secret.
  5. Set `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=true` (`.env.local` and
     Vercel env vars) to reveal the real button.
  **Phone sign-in** — still not implemented; needs an SMS provider
  (Supabase supports Twilio/MessageBird/Vonage).

## CLAUDE.md v2 migration gaps (2026-07-05, see ADR-0015)

- **REP actions not wireable yet** — `lib/rating/rep-engine.ts#REP_TABLE`
  records CLAUDE.md's entire earn/lose point table verbatim, each entry
  flagged `wired: true/false`. The `false` ones are real point values with
  no way to trigger them today, because the feature they depend on
  doesn't exist: offline/major event attendance + event organizing (no
  Events feature beyond a placeholder), useful-post marking (no
  upvote/quality mechanism), article editorial approval (posts publish
  immediately, no review queue), thank-you reactions (don't exist),
  challenges/competitions/club missions (don't exist), monthly
  membership/OC artifact purchases (no Shop/payments), and the entire
  "lose" side — report confirmed, incorrect behaviour, event disruption,
  spam, fraud, gross violation, exclusion (no moderation/reporting system
  exists at all yet — this is the same gap `v0.5`'s Trust Score work
  already flagged for the `-20`/`-50` deltas). **Fix:** wire each as its
  dependent feature gets built — the point values are already correct,
  just not triggerable.
- **Google Sign-In — ✅ built 2026-07-06, two real-login bugs found + fixed.**
  Max provided a real Google OAuth Client ID/Secret and enabled the
  provider in the Supabase Auth dashboard himself. Code side:
  `app/auth/callback/route.ts` (exchanges the PKCE `code` for a session)
  and a "Continue with Google" button on `/login`
  (`supabase.auth.signInWithOAuth`). **Bug 1 (cookie loss)**: the
  callback route initially wrote cookies through
  `lib/auth/supabase-server.ts#createClient()` (built for Server
  Components), which doesn't attach to a `NextResponse` constructed and
  returned manually — session established, but the cookie never reached
  the browser, so the next request to `/hall` bounced back to `/login`.
  Fixed by collecting cookies and applying them directly to whichever
  redirect response is actually returned. **Confirmed fixed** —
  verified in the database: `auth.users` has a real
  `rtmaksim15@gmail.com` row with `provider: "google"` and a populated
  `last_sign_in_at`. **Bug 2 (no membership on first sign-in)**: that
  same Google-authenticated user had no matching `public.users` row —
  the app still saw them as logged out. Since the club has no open
  registration, this was a real product question, not just a bug —
  Max confirmed: create a pending application, same as the landing
  page's waitlist form. Fixed: a first-time sign-in with no matching
  member now creates a real `Waitlist` row (`source: "Google OAuth"`)
  and lands on `/apply?status=pending`.
- **Shop & Payments — nothing beyond a placeholder** — `/shop` is an
  honest "coming soon" page, same pattern as `/events`. CLAUDE.md
  specifies: a real product catalog (Standard/Premium/Extra Premium
  tiers — concepts, not actual SKUs to seed), crypto payments (USDT/BTC/
  ETH) as primary, an adult-friendly card processor (Segpay/Epoch/CCBill
  are named) as secondary, and escrow logic for marketplace bookings.
  None of this is buildable without: real product data, a crypto payment
  gateway integration, a merchant account with one of the named
  processors (adult-content payment processing has real underwriting/
  compliance requirements — this is not a "just add Stripe" swap), and a
  real escrow/dispute design. **This is the single highest-effort and
  highest-compliance-risk item from the new CLAUDE.md** — needs its own
  planning pass with Max before any code, not a guess.
- **Feed isn't algorithmic** — CLAUDE.md specifies "For You" (algorithmic,
  ranked by rating + relevance + interests) and "Following" tabs.
  `/feed` today is a single plain reverse-chronological list. Ranking by
  "interests" is newly possible in principle (`User.interests` now
  exists) but no ranking algorithm exists, and "Following" needs a
  follow/follower relationship that doesn't exist in the schema at all.
- **No video posts** — CLAUDE.md specifies photo/video (≤60s) post media.
  `Post.mediaUrls` (a `Json` array) could hold video URLs mechanically,
  but there's no upload pipeline, no transcoding/compression, no duration
  enforcement, and no player UI. Uploadthing (already used for avatars)
  could plausibly host raw files, but 60-second-limit enforcement and
  compression are unsolved.

## Placeholder brand assets — fixed 2026-07-14, one caveat remains

- **`components/ui/Logo.tsx`** — unchanged, still `public/brand/
  oc-monogram.webp`, a **raster crop, not a true vector asset**. Fine at
  the sizes it's used (72–180px on `/login`, `/apply`); won't scale
  losslessly to print/large-format. Out of scope for the 2026-07-14
  landing-page logo fix (that work targeted the landing page's inline-SVG
  monogram specifically — see DECISIONS.md), but the same "get a true
  vector export from Max" fix would resolve this one too.
- **`app/(landing)/page.tsx`'s monogram** (nav, footer, Principles grid,
  Apply header) — was an inline hand-drawn SVG approximation (circle +
  arc + rotated square). Deleted (`components/ui/Monogram.tsx` removed
  entirely); replaced with `components/ui/LogoMark.tsx`, a real crop +
  alpha-matte cutout of `public/images/oc-logo.jpg` (the approved design
  package's actual logo), saved as `public/images/logo-mark.png`.
  **Caveat inherited from the source render**: the "black" O reads
  correctly only against a near-black background (its shading was baked
  assuming a black backdrop — there's no separate flat fill to recover).
  Verified it blends correctly against this site's actual dark tones
  (`#0A0908`, `#111009`); would look wrong (thin bright ring, not solid
  black) on a light or mid-tone background.
- **`lib/utils/ogIcon.tsx`** (PWA icons) and
  **`app/(landing)/opengraph-image.tsx`** (social share image) — were
  the old two-letter JSX-drawn placeholder. `ogIcon.tsx` deleted; PWA
  icons are now static files (`public/icons/icon-192.png`,
  `icon-512.png`) generated once from the real cutout. `opengraph-image.
  tsx` now embeds the real `public/images/logo.png` lockup instead of
  drawing text.

## Favicon — fixed 2026-07-14

`app/favicon.ico` was the default `create-next-app` scaffold icon (not
even an OC placeholder). Replaced with a real `.ico` (16/32/48/64/256,
generated from the same cutout). At 16–48px the thin double-line O
essentially disappears with no treatment (too little "ink" per pixel at
that scale), so the favicon variant specifically uses a brightness/
contrast-boosted pass over the same real pixels (a levels adjustment,
not a redraw) — the 192/512 PWA icons and everywhere else keep the
faithful, unboosted cutout. Still fairly subtle at 16px; a dedicated
small-icon mark from Max (bolder strokes) would read better, but this is
the real asset, boosted for legibility, not an invented shape.

## PWA: manifest exists, service worker doesn't

`public/manifest.json` and the app icons are wired up, but `next-pwa` is
installed and **not** activated in `next.config.mjs` — there's no service
worker, no offline support, no "Add to Home Screen" install prompt beyond
what the manifest alone provides. This was deliberately deferred in `v0.1`
to avoid debugging service-worker caching on top of everything else in the
same pass. **Fix:** wire `next-pwa` into `next.config.mjs` and verify
offline behavior before this app is positioned as "feels like an app" per
`CLAUDE.md`'s stated goal — currently tracked for `v0.2` or later in
`BACKLOG.md`.

## Database is now live (2026-07-05) — schema pushed via `db push`, not `migrate`

`DATABASE_URL`/`DIRECT_URL` in `.env.local` point at the real Supabase
project (`.env`, committed, correctly stays placeholder-only). Schema
was applied with `npx prisma db push` (all 17 models created directly),
**not** `prisma migrate dev`/`deploy` — there's no migration history
(`prisma/migrations/`) yet, since `db push` doesn't create one. This is
fine for a pre-launch project with no real data to preserve across
schema changes, but means: (1) any future schema change also needs
`db push` again (or a first `prisma migrate dev --create-only` pass to
retroactively baseline a migration history before switching to
`migrate deploy` for real deployments), and (2) there's no rollback
history — see `docs/README.md`'s development rule about flagging
gaps rather than silently working around them if this becomes a real
problem later.

**Operational gotcha discovered wiring this up:** the Prisma CLI
(`npx prisma ...`) only auto-loads `.env`, **not** `.env.local` (that's
a Next.js-only convention — the Next.js dev/build process reads
`.env.local` fine, but the standalone Prisma CLI doesn't). Real
secrets must never go in `.env` (committed, already public on GitHub),
so every `prisma db push`/`db pull`/`db seed`/etc. invocation needs the
`.env.local` values exported into the shell first:
`set -a && source .env.local && set +a && npx prisma <command>`. Worth
switching to a `prisma.config.ts` (Prisma's newer config format, which
the CLI already nags about in every run) or a `dotenv-cli` wrapper
script if this gets tedious.

## No email sending yet

`RESEND_API_KEY` is empty; `lib/utils/email.ts` no-ops safely. Same
blocked-on-Max category as above.

## No rate limiting

`ARCHITECTURE.md` §9 calls for rate limiting via Upstash Redis on all API
endpoints. `/api/waitlist` is public and currently has none — once a real
database is connected, it's open to spam/abuse. **Should be prioritized
before or immediately after the database goes live**, not deferred
indefinitely. (Note: this is unrelated to the RLS fix below — RLS
controls direct Postgres/Supabase-client access; `/api/waitlist` itself
is still unthrottled.)

## `waitlist` RLS — fixed 2026-07-13, worth a second look

RLS was fully disabled on `waitlist` (found while verifying the Landing
Page redesign's application form — see DECISIONS.md). Fixed: RLS
enabled, one `INSERT`-only policy for `anon`, no read policy for
anyone but the service role / `DATABASE_URL`'s role. Worth periodically
confirming this hasn't regressed (e.g. via `prisma db push`, which
doesn't manage RLS and won't warn if a future schema change on this
table needs new policies). **`waitlist` is the only table this applies
to** — see the top of this file for the other 14.

## No automated tests

Everything shipped in `v0.1.0` was verified manually (production build,
live preview screenshots, `curl` against the API, a real Lighthouse
audit) — there is no unit/integration/e2e test suite and no CI pipeline.
Acceptable for a single-page landing site; **not** acceptable once
authentication, payments, and user-generated content exist (`v0.2+`) — a
testing strategy should be decided (and get its own ADR) before then.

## `Waitlist.source` is unstructured

Free-text field, not a fixed enum — see
[ADR-0004](docs/ADR/0004-extend-waitlist-schema.md). Fine for now; may
need to become structured once the content/growth strategy
(`CONTENT_SYSTEM.md`) settles on a fixed set of acquisition channels worth
reporting on separately.

## Footer legal links are placeholders

Privacy/Terms/Contact in the landing footer all point to `#` — there are
no actual pages behind them yet. Cosmetically fine for a waitlist-stage
landing; **must** be real before the platform actually onboards paying/
data-collecting members.

## `NEXT_PUBLIC_APP_URL` unset

`metadataBase` in `app/layout.tsx` falls back to `http://localhost:3000`
when this env var isn't set — meaning OpenGraph/canonical URLs will
resolve incorrectly (to localhost) if deployed without setting it. **Must
be set in Vercel's environment variables at deploy time.**

## Initiation Ritual: step 5 needed content that didn't exist — fixed 2026-08-03

All 5 steps of `PRODUCT.md` §1 Stage 2's ritual (`/ritual`,
`lib/auth/ritual.ts`) are now real and actionable. Step 5
(`app/(platform)/ritual/safety-rules/page.tsx`) got its real Safety &
Respect copy from Max 2026-08-03, the last of the three content steps to
drop the `"deferred"` sentinel (Code of Conduct/introMaterial did so
2026-07-15). See `DECISIONS.md` (2026-07-02, 2026-07-15, 2026-08-03) and
[ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md).

All three content steps (`codeOfConduct`, `introMaterial`, `safetyRules`)
now store real per-user acceptance state in `UserProfile.ritualProgress`
(a JSON field, no schema migration needed) — `{step}: true` plus a
`{step}At` ISO timestamp, written by `POST /api/ritual/progress`. Any
member whose `ritualProgress` predates this change (stored `"deferred"`
from the old `INITIAL_RITUAL_PROGRESS`) is correctly re-surfaced as
`"todo"` for whichever step(s) they never actually read or accepted,
since the content didn't exist yet. The `"deferred"` sentinel itself and
`RitualStepStatus`'s third state are now fully retired from the codebase
— `newcomerRoom` (step 4) was already computed live, not from this
sentinel, well before this change.

## "Steady activity" / "high activity" have no defined metric

`PRODUCT.md` §2's Level II/III requirements reference activity levels
that aren't quantified anywhere. `lib/rating/level-progress.ts` shows
these as plain requirement text with no computed checkmark (see
`DECISIONS.md`, 2026-07-02) — there's currently no way to build a real
one without Max defining what "steady"/"high" activity actually means
(message count? login frequency? something else?).

**Consequence as of `v0.6`:** `lib/rating/level-progression.ts#checkLevelUp()`
auto-promotes Level I→II/II→III but can only gate on the criteria that
ARE real (reputation, referral count, has-published-content) — it
silently skips the activity requirement rather than blocking promotion
on an unmeasurable criterion. A member could get auto-promoted without
ever satisfying "steady"/"high activity" in whatever sense Max meant.
Same underlying gap, now with a real behavioral consequence instead of
just a missing checkmark on a dashboard.

## Level II→III "content or event contribution" only checks content

`lib/rating/level-progress.ts`/`level-progression.ts` treat this
criterion as satisfied by having published content; event participation
isn't checked (no Events feature exists yet, `v0.7`). A member who only
attends events won't show progress or get auto-promoted on that basis
alone — the display correctly shows this as unknown (`null`), not
`false`, but `checkLevelUp()` still can't promote them without published
content. Revisit once Events (`v0.7`) exists and can contribute a real
signal here.

## Referral lifecycle is one-way (`pending`→`joined` only)

`Referral.status` supports `pending`/`joined`/`active`/`problem`/`removed`
(`ARCHITECTURE.md` §3), but the approval flow only ever sets `joined` —
nothing transitions a referral to `active` (what makes an invitee
"active" vs. just "joined"?), and nothing handles `problem`/`removed`
(triggered when an invitee is warned/removed — the Trust Score impact
`PRODUCT.md` §6 describes isn't wired to anything yet). Needs the rating
engine (`v0.5`) to have real trigger points for these transitions.

## Notifications have no "mark as read" affordance

`Notification.isRead` exists and is displayed on `/hall`, but nothing
ever sets it to `true` — there's no read/unread interaction yet.

## Username collisions surface a generic error, no alternative suggestion — resolved 2026-08-07

`PATCH /api/profile` still returns `409` on a taken username as a
server-side backstop, but as of Username-in-the-Ritual
(`OBSIDIAN_ROADMAP_v3.1`) the UI now has a live availability check
(`GET /api/profile/username-check`, debounced) that tells the member
before they submit — the blind-submit-then-generic-error path this
entry was about no longer happens in normal use. No "try `name-2`
instead" suggestion was added; not asked for, and the live check
already prevents the frustrating case (finding out only after
clicking Save).

## `(auth)/apply/` folder purpose — resolved 2026-07-15/17

Settled in practice rather than by a direct answer from Max:
`app/(auth)/apply/page.tsx` is now the real post-OAuth landing for a
Google sign-in with no matching member account (built alongside the
OAuth task, 2026-07-15) — "Application Received" / "Request Access"
messaging, not a form. The actual application form still lives embedded
in the Landing page (`ApplicationForm`, `app/(landing)/page.tsx`),
unchanged. Re-confirmed during the Closed Registration & Invite System
task (2026-07-17), which reused this same "applications = `Waitlist`,
form already exists on the landing page" reading rather than building a
second form page — see DECISIONS.md, 2026-07-17. The three-path
(`OC_MASTER.md`) speculation below is still unbuilt and still needs
real specification if pursued.

**Possible new explanation (2026-07-04):** `OC_MASTER.md`'s three-path
access model ([Vision.md](docs/Vision.md#access-model--three-paths-oc_masterMD),
[ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md)) means
there may eventually be *three different* entry surfaces — the existing
Landing Page waitlist form (Path 3, manual review), a purchase-order
verification flow (Path 1), and a referral-link registration flow
(Path 2). Still a guess, not a confirmed answer — the underlying
question hasn't been asked directly.

## Username is auto-generated; no self-edit flow exists — resolved 2026-08-07

Stale on two counts even before this task: `/profile/edit` has existed
since `v0.16` (bio, avatar, city, role, interests), and as of
Username-in-the-Ritual (`OBSIDIAN_ROADMAP_v3.1`) username itself is
editable there too — one lifetime change, enforced server-side via
`User.usernameChangedAt`. The application form still never collects a
username (unchanged, and still correct — `generateUsernameFromEmail`
placeholder exists only so an account has *something* before a member
deliberately picks one, either at ritual time or later in Edit
Profile).

## Supabase Auth user creation isn't atomic with the `users` row write

`app/api/admin/applications/[id]/route.ts`: if Supabase Auth user creation
succeeds but the follow-up Prisma transaction (creating the `users` row,
marking the application approved) fails, there's an orphaned
`auth.users` row with no matching `public.users` row. Logged loudly via
`console.error` for manual reconciliation — there's no automated recovery.
Low risk at current scale (one admin, low volume) but should be revisited
before this becomes a high-throughput flow.

## `401`/`403` conflated in the admin API

`requireAdmin()` returns `403` whether the caller is anonymous or
logged-in-but-not-admin — see [docs/API/README.md](docs/API/README.md).
Fine for now (no client currently needs to distinguish the two), but
worth splitting if a client ever wants to show "log in" vs. "you don't
have access" differently.

## Avatar upload — resolved 2026-07-20 (User Profiles task)

Was blocked on Max provisioning an Uploadthing account
(`UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID` were always empty, so the
old flow was never actually verifiable). Replaced entirely with
Supabase Storage — `POST /api/profile/avatar`, same lazy-bucket pattern
as post photos, own `avatars` bucket — which needs no external account
beyond the Supabase project this app already depends on. Verified
end-to-end against the live project (real upload, real public URL,
real `User.avatarUrl` write). See DECISIONS.md, 2026-07-20.

## Realtime requires a manual Supabase dashboard step (`v0.4`)

`components/shared/RoomChat.tsx` subscribes to `postgres_changes` on the
`messages` table. Supabase requires Realtime to be explicitly enabled per
table (via the dashboard or a SQL `ALTER PUBLICATION`) — this isn't
something a Prisma migration configures. **Once Max provisions Supabase,
someone needs to enable Realtime on `messages` before chat updates live**
— otherwise messages will still send/persist correctly, they just won't
appear for other members without a manual page refresh.

## Room chat: no presence ("who's online"), no pagination, no edit/delete

`DESIGN.md`'s room spec includes "who's online" (Supabase Presence — a
different primitive from the `postgres_changes` used for messages) — not
built in `v0.4`; `BACKLOG.md`'s one-line v0.4 scope didn't call it out
specifically, so this is a scope boundary, not a silent cut, but it's
real work still to do. Message history is "latest 50, no further
pagination" — fine at zero real usage, will need cursor-based pagination
before real rooms have real history. No message edit/delete endpoints
(the `isDeleted` column exists, nothing sets it). No rate limiting on
posting.

## `RoomChat` re-fetches on every new message instead of merging the payload

Supabase Realtime's `postgres_changes` INSERT payload only contains the
raw new row (`user_id`, not the joined `displayName`/`avatarUrl`/`level`
the chat UI needs) — rather than doing a second lookup to enrich just
the new row, `RoomChat.tsx` re-fetches the whole message list on every
new-message event. Correct, but wasteful once a room has real traffic —
revisit with either a client-side user cache or a Realtime payload that
includes what's needed (e.g. a Postgres view/function).

## Newcomers' room 30-day window could permanently lock a member out of the Hall (`v0.5`)

`lib/auth/ritual.ts`'s step 4 now requires posting in the `newcomers`
room; `lib/rating/room-access.ts` closes that room 30 days after
`User.joinedAt`. A member who doesn't post within their first 30 days
loses access to the only room that can satisfy step 4 — permanently
blocked from completing the ritual and reaching the Hall, with no
built-in recovery path. **Needs a product decision**: a grace period, an
exception letting ritual-incomplete members into the newcomers' room
past 30 days, or something else. Not fixed — see
[ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md)'s
2026-07-04 update and `DECISIONS.md`.

## Rating engine's underspecified curves are this session's defaults, not spec

`ARCHITECTURE.md` §5 names what counts toward `activity` (messages,
posts, views) and how referral quality and achievements factor in, but
not the exact curves. `lib/rating/rating-engine.ts` implements
reasonable, documented defaults (see the file's own comments and
[docs/Architecture.md](docs/Architecture.md#rating-engine-actual-v05))
— revisit once there's real usage data showing they reward or punish the
wrong behavior. Likewise, `reputation` being a straight average of
received reviews (not a weighted/decayed average) is a default, not a
literal spec requirement — see [API/reviews.md](docs/API/reviews.md).

## Trust Score's `-20`/`-50` deltas aren't wired

`ARCHITECTURE.md` §5 specifies `-20` Trust Score for an invitee warning
and `-50` for an invitee removal — not implemented, because there's no
member-warning or member-removal admin capability yet to trigger them
from. The `+10` referral-activation bonus **is** wired (`v0.5`). Needs a
moderation/admin-action surface before these can be real.

## No real cron/background job infrastructure

Referral lifecycle transitions (`lib/rating/referral-lifecycle.ts`) only
run opportunistically when the inviter loads `/hall` — an inviter who
never visits won't have referrals promoted to `active`, and their Trust
Score bonus stays unapplied, until they do. Same underlying gap as
Realtime's manual-enablement issue above: this app has no scheduled-job
mechanism at all yet. Revisit once deployed to Vercel (Vercel Cron is
the natural fit) or once Supabase's `pg_cron` becomes relevant.

## Comment model — fixed 2026-07-17 (Feed & Posts MVP)

`GET`/`POST /api/posts/:id/comments` + `CommentSection.tsx` (flat list,
no nesting) are real now. Comments are gated the same way as the post
itself (`isPublished` + `minLevel`) — no separate, looser rule for who
can comment vs. who can see the post.

## Post media (`mediaUrls`) — fixed 2026-07-17, one photo only

`ContentComposer.tsx` can now attach a single photo per post, uploaded
to **Supabase Storage** (`POST /api/posts/photo`, bucket `post-photos`)
— deliberately not the existing `uploadthing` avatar pipeline, since the
Feed & Posts MVP task named Supabase Storage specifically (see
DECISIONS.md). Still not built: multiple photos per post, video
(`PRODUCT.md`'s content types imply both eventually).

## Content feed had no pagination beyond "latest 30" — fixed 2026-08-05

August hardening pass (ROADMAP v3.1), Block 5. `/feed` fetched `take:
30` with no way to reach anything published before that — a hard
ceiling on the whole feed, not just a missing "next page" affordance.
Fixed with offset (`skip`) pagination and a "Load more" button
(`components/shared/FeedList.tsx`, `GET /api/feed`), sharing one query
function (`lib/feed/query.ts`) between the initial SSR render and the
"load more" fetch so the two can never disagree about what belongs in
the feed. Offset-based, not cursor-based: simpler, and sufficient at
this app's real scale — same reasoning already applied to Rooms'
"latest 50 messages" (below) and this session's rate limiter. Revisit
if/when post volume is large enough for offset pagination's usual
issue (a new post while paging shifts every subsequent page by one) to
actually matter in practice.

Rooms' "latest 50 messages" gap (below) is the same shape and still
open — not addressed here, since the task that prompted this fix named
the feed specifically.

## Lord Obsidian reference portraits exist but aren't wired into the product

Max's `Визуал/` iCloud folder (2026-07-04) includes real, consistent
reference portraits of Lord Obsidian (see
[docs/LordObsidian.md](docs/LordObsidian.md)) — none are committed to
this repo or used anywhere in the live UI. Deliberately not done
unilaterally: which portrait (if any) becomes "the" canonical image and
where it should appear (Landing's "Lord Obsidian" card, `/ritual`,
approval emails) is a real product/brand decision. Also: one source
image includes background art not appropriate to publish as a
web-servable asset — be deliberate about which files ever land under
`public/` (anything there is directly web-accessible regardless of
whether a component references it). See `DECISIONS.md`, 2026-07-04.

## Blocked on Max (accounts Claude cannot create)

- Vercel project + domain (needed for any deployment at all)
- ~~Supabase Auth~~ — **resolved 2026-07-05**: Max provided the project
  URL and both API keys (publishable/anon, secret/service-role), wired
  into `.env.local` and verified live against the real project (see
  `DECISIONS.md`). `getCurrentUser()`/`middleware.ts` now make real
  Supabase Auth calls instead of degrading to "not configured."
- ~~Supabase database connection~~ — **resolved 2026-07-05**: Max
  provided the database password and the correct session-pooler
  connection string. `DATABASE_URL`/`DIRECT_URL` both point at
  `aws-1-us-east-2.pooler.supabase.com:5432` (session mode — supports
  DDL, unlike transaction-mode port `6543`; the project's direct
  `db.<ref>.supabase.co` host only resolves via IPv6, unreachable from
  this dev environment). `npx prisma db push` created all 17 tables;
  `npx prisma db seed` created the 9 starter rooms. Verified with a real
  write: `POST /api/waitlist` → confirmed via a direct Prisma query →
  deleted the test row. The database is live, schema-complete, and
  empty of real members. See `DECISIONS.md`.
- ~~At least one real `User.isAdmin = true`~~ — **resolved 2026-07-06**:
  see `BACKLOG.md` and `DECISIONS.md` — the real waitlist application
  for `lord.obsidian.oc@gmail.com` was approved directly (no admin
  existed yet to use the real endpoint — a genuine bootstrap case),
  with `isAdmin: true` and `role: dominant` per Max's request.
- **Still needed:** enabling Realtime on the `messages` table (one-time
  manual dashboard step, not something `db push` configures — see
  `v0.4`'s note above) — `/rooms/[slug]` chat won't push live updates
  without it.
- Resend account + verified sending domain (needed for `RESEND_API_KEY`)
- ~~Uploadthing account~~ — **no longer needed, 2026-07-20**: avatar
  upload moved to Supabase Storage (User Profiles task), which needs no
  separate account. See CHANGELOG.md/DECISIONS.md, 2026-07-20.
- **New (2026-07-17): a Supabase dashboard toggle only Max can flip** —
  Authentication → Providers → Email → "Allow new users to sign up."
  `app/register/route.ts` blocks this app's own `/register` path, but
  Supabase's project-level Auth REST API still accepts a raw signup call
  directly from the public anon key no matter what this codebase does —
  the service-role key doesn't expose project-Auth-settings access, only
  data-layer admin calls. Until this toggle is off, closed registration
  isn't airtight at the infrastructure level, even though every path
  inside the app itself is now closed. See DECISIONS.md, 2026-07-17.

These aren't "debt" in the sense of a shortcut taken — they're
external dependencies the implementer has no way to self-serve. Tracked
here so they stay visible, not because they represent a compromise.

## Post cards don't link the author to their profile (found 2026-07-20)

Now that `/profile/[username]` is a real page, `PostCard`'s author
name/avatar (rendered on `/feed`, `/library`, `/posts/[id]`, and the
new profile page's own "Recent Posts") is the one obviously-missing
inbound link to it — right now it's not clickable at all. Not built in
the User Profiles task because it touches every `select`ed `author`
field across eight files
(`app/(platform)/{feed,library,houses/[slug],posts/[id]}/page.tsx`,
`app/api/posts/{route,[id]/route,[id]/comments/route}.ts`) to add
`username`, which was outside that task's four numbered requirements.
Small, low-risk, and worth doing as its own pass.

## Analytics: two SPEC-analytics-panel.md §2.5 event types have nowhere to attach (2026-07-26)

`vault.item_claimed` and `search.performed` are both real entries in
the spec's taxonomy (§2.2) and both explicitly listed as insertion
points (§2.5), but neither has any code to instrument yet:

- **No Vault claim/redemption backend exists.** The `/vault` page's
  "Claim" button is `disabled` unconditionally
  (`title="Redemption isn't set up yet"`) — a pre-existing, already
  -documented gap (see `v0.13`'s BACKLOG entry). `vault.item_claimed`
  can be wired the moment that endpoint gets built; until then there's
  no "claim succeeded" moment to track.
- **No search feature exists anywhere in the app.** No search input,
  no search API route, nothing beyond Next.js's own `searchParams`
  plumbing (unrelated route query params, not a search feature). Same
  situation: `search.performed` is ready to wire the day a search
  feature exists, not before.

Also worth a look before Phase 1's operator console leans on this data:
`waitlist.rejected` events carry no `reason` in `meta`, even though the
spec's taxonomy names one — this app's decline flow has never captured
a reason at all (`PRODUCT.md` §1: declines carry no explanation by
design), so there's nothing real to put there. Not a bug, just a gap
between what the taxonomy's meta shape implies and what this product
actually records.

## Analytics: `post.reacted` / `rank.changed` / `profile.viewed` are real taxonomy entries, not yet wired (2026-07-26)

Unlike the two above, these three have real, already-found insertion
points (`app/api/posts/[id]/like/route.ts`'s new-like branch,
`lib/rating/level-progression.ts`'s `promote()`, and any page that
renders another member's profile) — they just weren't in
`SPEC-analytics-panel.md` §2.5's explicit "точки внедрения" list, which
Phase 0's task scoped tracking to. Straightforward to add in a follow
-up pass; deliberately left out rather than wiring beyond what was
asked.

## `POST /api/admin/rep-adjustment` lock — resolved 2026-07-27

Was gap: `/admin/rep` (the page) 404s while `REP_UI_ENABLED` is
`false`, but the route it posts to didn't independently check the flag
— reachable directly by anyone who already knew the endpoint. Closed
the same day: the route now returns 404 unconditionally before even
checking `requireAdmin()`, verified live with a plain unauthenticated
request (404 fires before the admin check would even run). See
DECISIONS.md, 2026-07-27.

## `OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md` — resolved 2026-07-27

Was missing from the repo when the "hide REP UI" task first referenced
it (checked twice, proceeded on Max's explicit instructions instead of
blocking). Now actually committed at the repo root. Reading it in full
surfaced scope beyond what the REP-only pass covered — see the new
entry below.

## Roadmap v3.0 defers more than REP: Houses UI and levels/gold/achievements — resolved 2026-07-27

`OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md` §V ("Осознанно отложено")
names REP/rating (already behind `REP_UI_ENABLED`) plus two more items
the current flag doesn't touch:

- **Houses** — "Слово временно убираем из интерфейса" (the word
  "Houses" is temporarily removed from the interface). Real UI surface:
  `/houses` (list), `/houses/[slug]` (detail), `JoinHouseButton`, the
  composer's house-tagging dropdown (`ContentComposer`), `PostCard`'s
  house pill, and presumably the bottom-nav "Community" tab if it links
  there. The roadmap explicitly keeps the Newcomers' room itself (part
  of the ritual), just not the Houses concept/label around it — a real
  design question on where exactly the line falls (e.g. does joining a
  house stay possible via a direct link even if not advertised, the
  same "logic keeps running, UI hides" shape `REP_UI_ENABLED` uses?).
- **"Gold, достижения, уровни"** (gold, achievements, **levels**) —
  levels/ranks (`LEVEL_NAMES`, Initiate→Council) are a separate system
  from `REP_UI_ENABLED` (gated by `User.reputation`, not `User.rep` —
  see DECISIONS.md, 2026-07-25) and weren't touched by that flag. Real
  UI surface: the level-name label on `/hall` and `/profile/[username]`,
  the `avatar-level-N` border styling used everywhere an avatar renders
  (`PostCard`, `/hall`, `/profile/[username]`), achievement grants
  (`lib/utils/achievements.ts`) and wherever they're displayed.

**Resolved same day**: Max's answer settled the open questions above —
same pattern as `REP_UI_ENABLED` for both (`HOUSES_UI_ENABLED`,
`LEVELS_UI_ENABLED`), full route/UI removal not just label-hiding for
Houses (`/houses`, `/houses/[slug]`, join API, composer dropdown,
`PostCard`'s house pill, `/rooms`' "Houses →" link), underlying
joins/promotions keep running silently either way. One explicit
exception: **the Newcomers' room stays fully functional** — it's a
`Room` (`slug: "newcomers"`), not a `House`, and has zero `houseId`
linkage (confirmed via `prisma/seed.ts`), so neither flag touches it.
Achievement grants were confirmed never displayed anywhere in the UI to
begin with — nothing to gate there. Verified live: the full Initiation
Ritual (profile → Code of Conduct → Lord Obsidian's intro → Newcomers'
room post) completed end-to-end with all three flags off, `/ritual`
correctly redirected to `/hall`, and `/hall`/`/feed`/`/houses`/`/vault`/
`/rooms` all rendered correctly with no console errors. See
CHANGELOG.md `v0.19.0` and DECISIONS.md, 2026-07-27.

## Library deferred, Rooms trimmed to Newcomers-only — resolved 2026-07-27

Same roadmap (§III/§IV) names the feed, post creation, comments, and
people search as "building now" — Library isn't in that list. Same
pattern as the other flags: `LIBRARY_UI_ENABLED = false` swaps
`/library`'s real content for a minimal teaser, route/nav tab kept.

The two House of Rope demo articles seeded 2026-07-09 ("What Is
Shibari?", "Getting Started in House of Rope") were unpublished
(`isPublished: false`, not deleted) rather than left to the flag —
they reference a deferred House and don't fit the launch content
policy regardless of when Library UI ships, so they shouldn't resurface
just because the flag flips later.

Separately, Max asked to trim the visible Rooms surface further than
just hiding the House of Rope-named room the Houses deferral already
made confusing — confirmed with him directly since the roadmap's own
defer table doesn't name Rooms/General/Local Circles at all, only
Houses. **Result**: `general`, all 7 Local Circles, and `house-of-rope`
are deactivated (`isActive: false`, not deleted) — only `newcomers`
remains visible on `/rooms`. No code changes were needed for this part:
`/rooms`, `/rooms/[slug]`, and every `/api/rooms/*` route already
gated fully on `room.isActive` before this task touched anything — a
pure data change closed it.

Verified via a mobile-viewport pass: Feed works end-to-end (composer,
publish), Vault and Library both show their teasers, Community shows
only Newcomers (as a room) and the Events link. See CHANGELOG.md
`v0.20.0` and DECISIONS.md, 2026-07-27.

## Photo upload in the composer failing in production — resolved 2026-07-29

`POST /api/posts/photo` proxied the file straight through this app's
own Next.js Route Handler to Supabase Storage via the service-role
client. Real production uploads failed with "Could not upload photo" —
traced to Vercel Serverless Functions' hard 4.5MB request-body cap
(`FUNCTION_PAYLOAD_TOO_LARGE`), not anything wrong with Storage itself
(confirmed by uploading directly against the real project — bucket
existed, correct 8MB `fileSizeLimit`, public, upload succeeded
instantly). Real phone photos routinely exceed 4.5MB, so they never
even reached this app's own more generous 8MB check.

**Fix**: the route no longer receives file bytes. It mints a signed
Supabase Storage upload URL/token (`createSignedUploadUrl`) and the
browser uploads directly to Storage via `uploadToSignedUrl` — the file
never passes through the Vercel function body at all, so its 4.5MB cap
no longer applies. Supabase's own bucket-level `fileSizeLimit` (8MB)
is what actually enforces the size cap now, on both new and existing
buckets going forward. Also set `allowedMimeTypes` on bucket creation —
belt-and-suspenders, since content type is now only declared by the
client pre-upload (not sniffed from real bytes server-side the way the
old proxy-upload flow could).

**Found in passing, not fixed**: `POST /api/profile/avatar` (avatar
upload) has the exact same proxy-through-the-function shape and the
same latent 4.5MB exposure. **Partially mitigated 2026-07-30**:
`AvatarUploadButton` now runs the same client-side compression as the
post composer (see the entry below) before uploading, which keeps
real-world avatar uploads well under 4.5MB in practice — but the route
itself still proxies bytes through the Vercel function body, so the
underlying exposure isn't actually closed, just made very unlikely to
trigger. Worth the same signed-URL fix in its own pass regardless of
how unlikely.

## Photo uploads failing on size, even after the signed-URL fix — resolved 2026-07-30

The `v0.21.0` signed-URL fix solved Vercel's 4.5MB function-body cap,
but real iPhone photos routinely exceed even this app's own, more
generous 8MB check — modern phone cameras commonly produce 10-25MB
files (especially with Live Photos / ProRAW / high-megapixel sensors).
That check was rejecting real photos client-side with "Image must be
8MB or smaller" before any upload was even attempted.

**Fix**: `lib/utils/compressImage.ts` — a client-side canvas pipeline
(resize to max 2048px long side, re-encode as JPEG at ~0.85 quality)
that runs on every photo before it's checked against the 8MB limit or
uploaded at all, in both `ContentComposer` (post photos) and
`AvatarUploadButton` (avatars). 8MB is now a post-compression safety
net for the rare oversized edge case, not the primary gate. HEIC files
(iOS's default camera format) go through the exact same generic
pipeline via `createImageBitmap` — no separate HEIC-specific code path
or third-party conversion library — which works wherever the browser
can natively decode HEIC (Safari/iOS, the real case this matters for);
unsupported elsewhere is an accepted gap, not something worth a
dependency for.

Verified live: a synthetic 4000×3000 test image was resized to
2048×1536 and uploaded successfully end-to-end (compress → signed URL
→ Storage → post creation), confirmed via network requests and the
resulting post rendering correctly in the feed.

## Library's real composer/browse code was deleted, not gated (2026-07-29)

Every other v1 deferral (REP, Houses, Levels) kept its real
implementation in the file behind a flag check, ready to reactivate.
Library's real article/lecture/course/manifesto browsing + composer
(built 2026-07-05/16) was different: it shared `ContentComposer` with
`/feed`, and that component was simplified the same day to a single
always-`"post"` composer (Threads-level-simplicity pass) with no type
selector or title field at all. Rather than leave Library's dead code
calling a prop shape (`allowedTypes`) that no longer exists on the
component, it was deleted outright. Rebuilding Library for real, once
`LIBRARY_UI_ENABLED` flips on, needs a composer built for what Library
actually needs (multiple content types, titles) — that's real,
unstarted work, not a flag flip away like Houses/Vault are.

## v1-scope UI audit, requested directly by Max (2026-07-29)

Surveyed every reachable member-facing route for content the roadmap
doesn't name as in scope. Not all of these are bugs — recorded here so
they're each a deliberate call, not an oversight:

- ~~Peer review (`ReviewForm` on `/profile/[username]`) still fully
  functional~~ — **resolved 2026-07-31**: both the review submission
  form and the read-only reviews list are now behind `REP_UI_ENABLED`,
  per Max's explicit Members & Follows design ("No REP, no reviews").
  Submission logic itself is untouched — same "keeps running silently"
  shape as REP's own ledger — only the UI is gated.
- **`/events`** — an honest "coming soon" placeholder, reachable via a
  link on `/rooms`. Not named anywhere in the roadmap's scope tables
  (in or out) — predates this pass, low risk, but flagged since it's a
  real, clickable nav destination the roadmap doesn't account for.
- ~~People search and follows — named as "building now" (§III item 7:
  "нашёл, посмотрел профиль, подписался") but don't exist at all.~~ —
  **follows resolved 2026-07-31** (`OBSIDIAN_ROADMAP_v3.1`'s Members &
  Follows): the `Follow` model, follow/unfollow, and follower/following
  counts are real now. **Search is still missing** — a small closed
  club gets a `/members` directory instead (design decision, not a
  gap): no search input exists, and none is planned until membership
  passes ~30 people. No `follow`/`follower` feed filtering yet either —
  deliberately deferred, see BACKLOG.md `v0.23`.
- ~~**Username selection in the Initiation Ritual** — roadmap names this
  as a new v1 requirement (replacing the auto-generated
  `email-numbers` username); not built.~~ — **resolved 2026-08-07**,
  see this file's "Username is auto-generated" entry further up.
- **Safety & Respect Guidelines** — still the pre-existing "Content
  pending" placeholder in the ritual; unchanged by this pass, already
  tracked further up this file.

Everything else checked (Houses, Levels, Library, Vault, REP, Rooms'
General/Local Circles) was already deferred behind a flag or
deactivated by an earlier pass this same week — see the entries above.

## `/rooms`'s index page skipped while only one room is active — resolved 2026-07-30

With `general` and the 7 Local Circles deactivated (see the entry
above) and only `newcomers` left active, the "ROOMS" list page was
showing exactly one item — a list-of-one, plus an Events link, for a
Community tab that only ever leads one place. `/rooms/page.tsx` now
redirects straight to the sole active room when `rooms.length === 1`,
before rendering the heading or the Events/Houses link row at all.

Deliberately not a feature flag: the condition is `rooms.length === 1`
against live data, not a named roadmap-deferred concept with its own
later-reactivation story. As soon as a second room is reactivated
(`isActive: true`), this stops firing on its own and the real index
renders again — no code change or flag flip needed. `/events` stays
reachable directly by URL either way, just not linked from this path.

## Invitation & Partner system v1 (2026-08-01) — known gaps, on purpose

Built per `OBSIDIAN_ROADMAP_v3.1`. Two things deliberately left out,
recorded so they're a documented choice, not an oversight:

- **No self-service admin UI to adjust `inviteAllowance` or to unlink a
  partner.** Both fields are real and adjustable — just not through a
  page yet, only via direct database access. The task's explicit build
  list was the three redemption mechanics themselves
  (`/admin/invite-batches`, "My Invitation" on `/hall`, partner
  linking); a dedicated "edit this member's allowance" or "unlink this
  partner" admin screen wasn't in that list, so one wasn't built. Worth
  its own small pass once this is used enough to matter — see
  BACKLOG.md.
- **No REP or `Referral`/Trust-Score wiring for any of the three new
  sources.** The original referral-code flow
  (`app/api/invite/[token]/route.ts`) awards `verificationPassed` REP
  to every new member and `invitedNewMember` REP to the inviter, and
  creates a `Referral` row feeding `referralCount`/Trust-Score
  lifecycle transitions. None of that was asked for here, and none of
  it was added — `invitedById` is set directly (enough to power the
  "Invited by" profile line), but there's no `Referral` row behind it,
  so member-invited joins don't participate in the Trust-Score
  lifecycle at all. `verificationPassed` doesn't apply to any of the
  three new sources either, semantically — that REP entry is
  specifically about surviving admin review of an application, which
  purchase-card/member-invite/partner joins skip by design ("no
  application step: redeeming goes straight to registration"). Whether
  any of REP_TABLE's existing categories should extend to these new
  paths, or whether they need their own, is a real open product
  question — not decided here, not guessed at either way.

Also: purchase-card CSV links (`{NEXT_PUBLIC_APP_URL}/join/{token}`)
depend on `NEXT_PUBLIC_APP_URL` actually being set for a printable,
absolute URL — same pre-existing gap the old `/?ref=` referral link
had (see "`NEXT_PUBLIC_APP_URL` unset" further up this file), not a
new one.
