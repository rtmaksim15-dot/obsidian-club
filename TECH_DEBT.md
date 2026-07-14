# Technical Debt

Known compromises, temporary implementations, and future work — recorded
here so nothing survives only in a chat transcript or someone's memory.
Each item should eventually become a `BACKLOG.md` entry once it's actually
scheduled; until then, it lives here as "known, not forgotten, not yet
prioritized."

## Houses / Vault / Apple Sign-In gaps (2026-07-08/09, see ADR-0016)

- **8 more houses have no names yet** — CLAUDE.md says "9 more houses
  (leather, protocol, impact etc.)" as examples, not a decided list.
  Don't seed placeholder houses for these; wait for Max to name them.
- **Vault catalog is empty** — `VaultItem` model + `/vault` +
  `POST /api/admin/vault-items` are real, but no items exist. Max adds
  real ones once he defines a catalog.
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
table needs new policies).

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

## Initiation Ritual: 4 of 5 steps need content/features that don't exist (`v0.3`)

`PRODUCT.md` §1 Stage 2's 5-step ritual is now real infrastructure
(`/ritual`, `lib/auth/ritual.ts`, gates the Hall) — but only step 1
(complete profile) is actually actionable. Steps 2 (Code of Conduct), 3
(Lord Obsidian's intro material), and 5 (safety/respect rules) need real
policy/narrative content **Max hasn't written anywhere** in the source
doc package; step 4 (newcomers' room) needs Rooms (`v0.4`). All four
render as honest "pending" states, never faked complete. See
`DECISIONS.md` (2026-07-02) and
[ADR-0013](docs/ADR/0013-initiation-ritual-step4-deferred.md). **Needs
Max to provide the actual Code of Conduct / Lord Obsidian's introduction
/ safety guidelines text** before steps 2/3/5 can become real.

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

## Username collisions surface a generic error, no alternative suggestion

`PATCH /api/profile` returns `409` on a taken username with no "try
`name-2` instead" affordance — acceptable for a first pass, worth
revisiting once profile editing gets real usage.

## `(auth)/apply/` folder purpose is unclear

`ARCHITECTURE.md` §7's folder plan lists `app/(auth)/apply/` as "форма
заявки" (application form) — but the actual waitlist application form
lives embedded in the Landing page (`app/(landing)/page.tsx`'s Apply
section), matching `DESIGN.md` §6's Landing Page spec exactly (a single
scrolling page with the form at the bottom). It's unclear whether
`(auth)/apply/` is meant to be a *separate*, standalone `/apply` route
(e.g. for direct-linking from marketing instead of the full landing), or
just an artifact of the original folder plan that predates the landing's
actual single-page design. **Not resolved — needs Max's input**, not a
guess. The folder remains empty.

**Possible new explanation (2026-07-04):** `OC_MASTER.md`'s three-path
access model ([Vision.md](docs/Vision.md#access-model--three-paths-oc_masterMD),
[ADR-0014](docs/ADR/0014-adopt-oc-master-as-strategic-source.md)) means
there may eventually be *three different* entry surfaces — the existing
Landing Page waitlist form (Path 3, manual review), a purchase-order
verification flow (Path 1), and a referral-link registration flow
(Path 2). `(auth)/apply/` could plausibly become the home for Path 1 or
Path 2's registration form once those are specified. Still a guess, not
a confirmed answer — the underlying question hasn't been asked directly.

## Username is auto-generated; no self-edit flow exists

The application form never collects a username (not specified anywhere in
`DESIGN.md`/`PRODUCT.md`). `lib/utils/codes.ts#generateUsernameFromEmail`
derives a placeholder from the applicant's email on approval. There's no
"edit my profile" page yet for a member to change it (or their bio,
avatar via the profile page rather than the Hall, etc.) — avatar upload
currently lives on `/hall` somewhat awkwardly, since there's no dedicated
settings page. Expected to be resolved as part of the Initiation
Ritual / full Hall UI (`v0.3`).

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

## Avatar upload is wired but unverified

`app/api/uploadthing/`, `lib/utils/uploadthing.ts`,
`components/shared/AvatarUploadButton.tsx` are all in place and build
cleanly, but `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID` are empty — same
blocked-on-Max pattern as Resend/Supabase. **Cannot be verified
end-to-end** (a real upload, a real `onUploadComplete` write) until Max
provisions an Uploadthing account.

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

## Comment model exists but has no API/UI (`v0.6`)

`Comment` was added to the schema alongside `Like` (real like-toggling
needed a join table; comments were added at the same time since they're
adjacent and equally absent from the original spec's data model) — but
nothing can create or read a comment yet. `/content` shows a live
`_count.comments` (always 0 today) with no way to change that. Needs its
own pass: `POST/GET /api/posts/:id/comments`, a UI thread, and a decision
on whether comments are level-gated like posts or open to anyone who can
see the post.

## Post media (`mediaUrls`) has no upload path

`Post.mediaUrls` (a `Json` array) exists in the schema and is selected
by the API, but nothing writes to it — `ContentComposer.tsx` is
text-only. `PRODUCT.md`'s content types (photos, video) imply media is
expected eventually; would reuse the existing `uploadthing` integration
(already wired for avatars) rather than a new upload path.

## Content feed has no pagination beyond "latest 20"

Same shape of gap as Rooms' "latest 50 messages" — fine at zero real
usage, needs cursor-based pagination before real content volume exists.

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
- Uploadthing account (needed for `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID`)

These aren't "debt" in the sense of a shortcut taken — they're
external dependencies the implementer has no way to self-serve. Tracked
here so they stay visible, not because they represent a compromise.
