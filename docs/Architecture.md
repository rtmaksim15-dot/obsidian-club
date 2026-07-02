# Architecture (as-built)

> This is the **living, as-built** counterpart to Max's original
> `ARCHITECTURE.md` (iCloud package). Where the two disagree, it's because a
> documented decision (linked below) changed course — never a silent drift.
> If you find a mismatch that ISN'T explained by a linked ADR, that's a
> conflict: stop and flag it (see [docs/README.md](README.md)).

Current version: **v0.2.0** (Authentication). `package.json`'s `version`
field is the single source of truth for the current version number.

## Stack (as actually installed)

| Layer | Choice | Version | Deviation from spec? |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 | Yes — pinned below "latest". See [ADR-0001](ADR/0001-pin-nextjs-14-tailwind-v3.md) |
| Styling | Tailwind CSS | 3.4.1 | Yes — pinned below "latest". See [ADR-0001](ADR/0001-pin-nextjs-14-tailwind-v3.md) |
| Language | TypeScript | 5.x | No |
| ORM | Prisma | 6.19.3 | Yes — pinned below "latest" (7.x). See [ADR-0002](ADR/0002-pin-prisma-v6.md) |
| DB driver | `@prisma/client` | 6.19.3 | matches Prisma |
| DB (target) | PostgreSQL via Supabase | — | Not yet provisioned, see [TECH_DEBT.md](../TECH_DEBT.md) |
| Auth | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) | 0.12.0 / 2.110.0 | Resolves a real ambiguity across two `ARCHITECTURE.md` sections. See [ADR-0010](ADR/0010-supabase-auth.md) |
| Animation | framer-motion | 12.42.2 | Installed per spec, but **not used** on the public landing page — see [ADR-0003](ADR/0003-remove-framer-motion-from-landing.md) |
| Icons | lucide-react | 1.22.0 | No |
| Email | Resend | 6.16.0 | Installed, not yet connected (no API key) |
| File upload | uploadthing | 7.7.4 | Wired (avatar upload), not yet connected (no keys) |
| Analytics | @vercel/analytics | 2.0.1 | Chosen over Google Analytics — see [ADR-0008](ADR/0008-vercel-analytics-over-ga.md) |
| Hosting (target) | Vercel | — | Not yet deployed, see [TECH_DEBT.md](../TECH_DEBT.md) |

## Folder structure (actual)

```
obsidian-club/
├── middleware.ts                        # session refresh + route protection
├── app/
│   ├── (auth)/
│   │   ├── apply/                       # empty — purpose unclear, see TECH_DEBT.md
│   │   └── login/page.tsx               # Supabase email/password sign-in
│   ├── (landing)/
│   │   ├── page.tsx                     # the public Landing page
│   │   └── opengraph-image.tsx          # generated social share image
│   ├── (platform)/
│   │   ├── hall/page.tsx                # minimal status view (v0.2; full UI is v0.3)
│   │   ├── profile/[id]/page.tsx        # minimal profile view (v0.2; tabs are v0.3)
│   │   ├── admin/applications/page.tsx  # admin panel v1 — approve/decline
│   │   └── rooms|events|content|marketplace|progress/  # empty — v0.3+
│   ├── api/
│   │   ├── waitlist/route.ts
│   │   ├── admin/applications/route.ts, [id]/route.ts
│   │   └── uploadthing/core.ts, route.ts
│   ├── icons/icon-192.png/route.tsx, icon-512.png/route.tsx
│   ├── layout.tsx                       # fonts, metadata, Analytics
│   └── globals.css                      # full DESIGN.md token system
├── components/
│   ├── ui/Logo.tsx                      # OC monogram (placeholder, see TECH_DEBT)
│   └── shared/WaitlistForm.tsx, Reveal.tsx, ApplicationsQueue.tsx, AvatarUploadButton.tsx
├── lib/
│   ├── auth/
│   │   ├── supabase-browser.ts          # Client Component Supabase client
│   │   ├── supabase-server.ts           # Server Component / Route Handler client
│   │   ├── supabase-admin.ts            # service-role client — server-only
│   │   ├── session.ts                   # getCurrentUser()
│   │   └── require-admin.ts             # requireAdmin()
│   ├── db/prisma.ts
│   └── utils/email.ts, ogIcon.tsx, codes.ts, uploadthing.ts
├── prisma/schema.prisma
└── docs/, CHANGELOG.md, DECISIONS.md, TECH_DEBT.md, BACKLOG.md
```

`components/hall/`, `components/rooms/`, `components/profile/`,
`components/events/`, `lib/rating/`, `lib/referral/` still exist as empty
directories, reserved for `v0.3+`.

## Data model (actual, `prisma/schema.prisma`)

All 13 models from the original spec exist: `User`, `UserProfile`, `Room`,
`Message`, `Post`, `Event`, `EventAttendee`, `Review`, `Referral`,
`Achievement`, `UserAchievement`, `RatingHistory`, `MarketplaceItem`,
`Notification`, plus `Waitlist`.

**Deviations from `ARCHITECTURE.md` §3/§10** (all documented, none
silent):
- `Waitlist` has three extra columns (`age`, `city`, `source`) — see
  [ADR-0004](ADR/0004-extend-waitlist-schema.md).
- `Waitlist` has status tracking (`status`, `reviewedAt`, `reviewedBy`) —
  see [ADR-0012](ADR/0012-waitlist-status-tracking.md).
- `User` has `isAdmin` — see [ADR-0011](ADR/0011-isadmin-field.md).

`User.id` is expected to match the corresponding Supabase
`auth.users.id` exactly (same UUID) — enforced by application code at
creation time (`app/api/admin/applications/[id]/route.ts`), not by a
database constraint. See [ADR-0010](ADR/0010-supabase-auth.md).

No migrations have been run against a real database yet — `DATABASE_URL`
in `.env.local` is a placeholder. See [TECH_DEBT.md](../TECH_DEBT.md).

## API (actual)

- `POST /api/waitlist` — see [API/waitlist.md](API/waitlist.md).
- `GET /api/admin/applications`, `PATCH /api/admin/applications/:id` —
  see [API/admin.md](API/admin.md).
- `GET/POST /api/uploadthing` — uploadthing's generated handler, not
  independently documented (framework-owned).

Conventions: [API/README.md](API/README.md)
([ADR-0005](ADR/0005-api-conventions.md)).

## Auth & route protection (actual)

`middleware.ts` refreshes the Supabase session on every request and
redirects unauthenticated visitors away from `/hall`, `/rooms`,
`/profile`, `/events`, `/content`, `/marketplace`, `/progress`, and
`/admin` (page routes only — **not** `/api/admin/*`, which must and does
call `requireAdmin()` itself; see
[API/README.md](API/README.md#auth-v02)). Both `middleware.ts` and
`lib/auth/session.ts` degrade to "not logged in" rather than crashing
when Supabase isn't configured — see the near-miss recorded in
`DECISIONS.md` (2026-07-02).

## Deployment status

Not deployed. No Vercel project, no Supabase project, no Resend account,
no Uploadthing account connected — all four require Max's own login (see
[TECH_DEBT.md](../TECH_DEBT.md)). The app builds and runs correctly
locally (`npm run build`, `npm run dev`); route protection has been
verified to fail closed (redirect to `/login`) rather than crash in the
absence of real Supabase credentials.

## Security posture (current, honest)

The original `ARCHITECTURE.md` §9 requirements: authentication now exists
(Supabase Auth); Row Level Security, rate limiting, encryption, and GDPR
deletion are **still not implemented** — tracked in
[TECH_DEBT.md](../TECH_DEBT.md). `/api/waitlist` does basic server-side
validation and avoids email enumeration; `/api/admin/*` requires
`isAdmin`, checked server-side on every request, never trusted from the
client.
