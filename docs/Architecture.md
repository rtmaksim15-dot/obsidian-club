# Architecture (as-built)

> This is the **living, as-built** counterpart to Max's original
> `ARCHITECTURE.md` (iCloud package). Where the two disagree, it's because a
> documented decision (linked below) changed course — never a silent drift.
> If you find a mismatch that ISN'T explained by a linked ADR, that's a
> conflict: stop and flag it (see [docs/README.md](README.md)).

Current version: **v0.1.0** (Landing). `package.json`'s `version` field is
the single source of truth for the current version number.

## Stack (as actually installed)

| Layer | Choice | Version | Deviation from spec? |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 | Yes — pinned below "latest". See [ADR-0001](ADR/0001-pin-nextjs-14-tailwind-v3.md) |
| Styling | Tailwind CSS | 3.4.1 | Yes — pinned below "latest". See [ADR-0001](ADR/0001-pin-nextjs-14-tailwind-v3.md) |
| Language | TypeScript | 5.x | No |
| ORM | Prisma | 6.19.3 | Yes — pinned below "latest" (7.x). See [ADR-0002](ADR/0002-pin-prisma-v6.md) |
| DB driver | `@prisma/client` | 6.19.3 | matches Prisma |
| DB (target) | PostgreSQL via Supabase | — | Not yet provisioned, see [TECH_DEBT.md](../TECH_DEBT.md) |
| Auth | *undecided* | — | ARCHITECTURE.md proposes NextAuth v5 **or** Clerk; not yet chosen. See [BACKLOG.md](../BACKLOG.md) v0.2 |
| Animation | framer-motion | 12.42.2 | Installed per spec, but **not used** on the public landing page — see [ADR-0003](ADR/0003-remove-framer-motion-from-landing.md) |
| Icons | lucide-react | 1.22.0 | No |
| Email | Resend | 6.16.0 | Installed, not yet connected (no API key) |
| File upload | uploadthing | 7.7.4 | Installed, not yet used |
| Analytics | @vercel/analytics | 2.0.1 | Chosen over Google Analytics — see [ADR-0008](ADR/0008-vercel-analytics-over-ga.md) |
| Hosting (target) | Vercel | — | Not yet deployed, see [TECH_DEBT.md](../TECH_DEBT.md) |

## Folder structure (actual)

```
obsidian-club/
├── app/
│   ├── (auth)/apply/, (auth)/login/     # empty — Stage 2 (v0.2)
│   ├── (landing)/
│   │   ├── page.tsx                     # the only real page — Landing
│   │   └── opengraph-image.tsx          # generated social share image
│   ├── (platform)/hall|rooms|profile|events|content|marketplace|progress/
│   │                                     # all empty — Stage 2+ (v0.2+)
│   ├── api/waitlist/route.ts            # the only real API route
│   ├── icons/icon-192.png/route.tsx     # generated PWA icon (next/og)
│   ├── icons/icon-512.png/route.tsx     # generated PWA icon (next/og)
│   ├── layout.tsx                       # fonts, metadata, Analytics
│   └── globals.css                      # full DESIGN.md token system
├── components/
│   ├── ui/Logo.tsx                      # OC monogram (placeholder, see TECH_DEBT)
│   └── shared/WaitlistForm.tsx, Reveal.tsx
├── lib/
│   ├── db/prisma.ts                     # Prisma client singleton
│   └── utils/email.ts, ogIcon.tsx
├── prisma/schema.prisma                 # full data model (see below)
└── docs/, CHANGELOG.md, DECISIONS.md, TECH_DEBT.md, BACKLOG.md
```

`components/hall/`, `components/rooms/`, `components/profile/`,
`components/events/`, `lib/auth/`, `lib/rating/`, `lib/referral/` exist as
empty directories, reserved per the original `ARCHITECTURE.md` §7 folder
plan, awaiting Stage 2 (v0.2+).

## Data model (actual, `prisma/schema.prisma`)

All 13 models from the original spec exist: `User`, `UserProfile`, `Room`,
`Message`, `Post`, `Event`, `EventAttendee`, `Review`, `Referral`,
`Achievement`, `UserAchievement`, `RatingHistory`, `MarketplaceItem`,
`Notification`, plus `Waitlist`.

**`Waitlist` deviates from the original spec** — it has three extra
columns (`age`, `city`, `source`) beyond the minimal
`(id, email, name, referral_code, invited_by, created_at)` the original
`ARCHITECTURE.md` §10 lists. See [ADR-0004](ADR/0004-extend-waitlist-schema.md).

No migrations have been run against a real database yet — `DATABASE_URL`
in `.env.local` is a placeholder. See [TECH_DEBT.md](../TECH_DEBT.md).

## API (actual)

Only one endpoint exists: `POST /api/waitlist`. See
[API/waitlist.md](API/waitlist.md) for its contract, and
[API/README.md](API/README.md) for the conventions it establishes
([ADR-0005](ADR/0005-api-conventions.md)) that future endpoints should
follow.

## Deployment status

Not deployed. No Vercel project, no Supabase project, no Resend account
connected — all three require Max's own login (see
[TECH_DEBT.md](../TECH_DEBT.md)). The app builds and runs correctly
locally (`npm run build`, `npm run dev`).

## Security posture (current, honest)

The original `ARCHITECTURE.md` §9 security requirements (RLS, rate
limiting, encryption, GDPR deletion) are **not yet implemented** — there's
no auth or user data storage yet to secure. The one live data-collection
surface, `/api/waitlist`, does basic server-side validation (age ≥ 18,
email format) and avoids email enumeration on duplicate submission, but has
no rate limiting. Tracked in [TECH_DEBT.md](../TECH_DEBT.md).
