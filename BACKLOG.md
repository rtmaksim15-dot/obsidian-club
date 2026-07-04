# Backlog

Organized by product version, not calendar week (see
[docs/README.md](docs/README.md#versioning)). Version → feature-area
mapping below is derived directly from `ROADMAP.md`'s existing Stage 2
plan, just re-labeled — no new scope has been invented.

**Rule: items only move between Now / Next / Later with Max's approval.**
This file records what's planned, not a queue anyone can reshuffle
unilaterally.

## Now

*What's actively in progress or immediately blocking.*

- [ ] Vercel project + deploy `v0.1.0` (blocked — needs Max's account, see
      `TECH_DEBT.md`)
- [ ] Supabase project + real `DATABASE_URL`/`DIRECT_URL`, run first
      migration (blocked — needs Max's account)
- [ ] Resend account + verified sending domain + real `RESEND_API_KEY`
      (blocked — needs Max's account)
- [ ] Uploadthing account + real `UPLOADTHING_SECRET`/`UPLOADTHING_APP_ID`
      (blocked — needs Max's account; needed to verify avatar upload)
- [ ] Set `NEXT_PUBLIC_APP_URL` in Vercel once the domain is live (see
      `TECH_DEBT.md`)
- [ ] Once Supabase is live: set at least one real `User.isAdmin = true`
      directly in the database (no admin-granting UI exists yet)
- [ ] **Max to provide real content** for Initiation Ritual steps 2/3/5:
      Code of Conduct text, Lord Obsidian's introductory material,
      safety/respect guidelines (see `TECH_DEBT.md`) — blocks the ritual
      from being real, not just technical wiring

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

## Later

*Intentionally postponed — approved direction, not yet scheduled in
detail. Derived from `ROADMAP.md`'s existing Stage 2 plan.*

### v0.5 — Reputation

(Source: `ROADMAP.md`, September Weeks 3–4) — star ratings, peer reviews,
the rating engine + weighting (`ARCHITECTURE.md` §5), rating history log,
the referral "Trust Chain" mechanics (see `docs/UX.md`).

### v0.6 — Content & Achievements

(Source: `ROADMAP.md`, October Weeks 1–2) — content feed, member-created
content by level, basic library, achievements system, rituals/tasks
(initiation + progressive).

### v0.7 — Events & Marketplace

(Source: `ROADMAP.md`, October Weeks 3–4) — events (list + detail +
registration, level/Trust-Score gating), admin panel v2, basic
marketplace vitrine.

### v0.8 — Beta Hardening

(Source: `ROADMAP.md`, November) — closed beta (20–50 members from the
waitlist), load testing, security audit (RLS, rate limiting — see
`TECH_DEBT.md`), Stripe integration, PWA finalization (offline, push
notifications — see `TECH_DEBT.md`'s service-worker gap).

### v0.9 — Launch Preparation

(Source: `ROADMAP.md`, December) — final QA, first invitation wave,
branded error pages (404/500), onboarding/Initiation Ritual flow,
monitoring (Sentry).

### v1.0 — Public Launch

(Source: `ROADMAP.md`, January 2027) — first wave of 100–200 members.

### Unscheduled ideas (post-`v1.0`, per `ROADMAP.md`)

- `v1.1` — full Marketplace
- `v1.2` — iOS app
- `v1.3` — Android app
- `v2.0` — Desktop + scaling
