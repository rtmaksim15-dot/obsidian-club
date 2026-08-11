# Obsidian Club

A closed, premium community platform. See
[CHANGELOG.md](CHANGELOG.md) for the current version and what shipped
in each release (`package.json`'s `version` field is the source of
truth — this file deliberately doesn't hardcode it, see
docs/Architecture.md's note on why that goes stale).

## Documentation first

This project runs on a documentation-as-source-of-truth model. Before
changing anything, read **[docs/README.md](docs/README.md)** — it explains
the full documentation structure and the core rule: *if the code and the
docs disagree, stop, report the conflict, and ask — don't silently resolve
it either direction.*

Quick map:

- [docs/Vision.md](docs/Vision.md), [docs/Philosophy.md](docs/Philosophy.md) — what this is and why
- [docs/Architecture.md](docs/Architecture.md) — actual current technical state
- [docs/UX.md](docs/UX.md), [docs/UI.md](docs/UI.md) — product mechanics and the design system
- [docs/API/](docs/API/) — API conventions and endpoints
- [docs/ADR/](docs/ADR/) — why specific technical decisions were made
- [DECISIONS.md](DECISIONS.md) — chronological log of all decisions
- [TECH_DEBT.md](TECH_DEBT.md) — known compromises and gaps
- [BACKLOG.md](BACKLOG.md) — what's planned, by version (Now / Next / Later)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Real member-facing
areas include the landing page (`app/(landing)/page.tsx`), authenticated
platform routes under `app/(platform)/` (feed, hall, rooms, vault, houses,
profile, admin, ritual, codex — gated by `middleware.ts`), the public
legal pages (`/terms`, `/privacy`, `/guidelines`, `/dmca`), and the
registration/invite flows under `app/(auth)/`. See
[docs/Architecture.md](docs/Architecture.md) for the full current map.

```bash
npm run build   # production build
npm run start   # serve the production build locally
npm run lint    # ESLint
```

Copy `.env.example` to `.env.local` and fill in real values as each
service (Supabase, Resend, Vercel) is connected — see
[TECH_DEBT.md](TECH_DEBT.md) for what's still pending.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS v3 + Prisma 6 +
PostgreSQL (Supabase). Version pins are deliberate — see
[ADR-0001](docs/ADR/0001-pin-nextjs-14-tailwind-v3.md) and
[ADR-0002](docs/ADR/0002-pin-prisma-v6.md) before "helpfully" upgrading
anything.
