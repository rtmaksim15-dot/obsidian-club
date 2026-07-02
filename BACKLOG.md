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
- [ ] Set `NEXT_PUBLIC_APP_URL` in Vercel once the domain is live (see
      `TECH_DEBT.md`)

## Next

*Approved upcoming work — `v0.2`.*

### v0.2 — Authentication

(Source: `ROADMAP.md`, August Weeks 1–2)

- [ ] Decide auth strategy: NextAuth v5 vs. Clerk (open decision — see
      `DECISIONS.md`'s pending entry; **do not decide silently**, confirm
      with Max)
- [ ] Registration / login flow
- [ ] Admin panel v1 — approve/decline applications from the Waitlist
- [ ] Basic member profile (data model already exists in
      `prisma/schema.prisma`)
- [ ] Avatar upload (uploadthing is installed, unused so far)
- [ ] Level system live in the database (schema exists; needs the actual
      promotion logic)
- [ ] Hall (`/hall`) route structure — currently referenced by
      `manifest.json`'s `start_url` but doesn't exist yet

## Later

*Intentionally postponed — approved direction, not yet scheduled in
detail. Derived from `ROADMAP.md`'s existing Stage 2 plan.*

### v0.3 — User Profile / The Hall

(Source: `ROADMAP.md`, August Weeks 3–4) — full Hall UI (avatar, level,
reputation, rating), progress-to-next-level tracking, referral link
generation, basic notifications, mobile bottom navigation.

### v0.4 — Community / Rooms

(Source: `ROADMAP.md`, September Weeks 1–2) — room list/types, real-time
chat (Supabase Realtime), level-gated access, newcomers' room, first local
circles.

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
