# ADR-0002: Pin Prisma to v6 (not v7)

**Status:** Accepted
**Date:** 2026-07-01

## Context

`ARCHITECTURE.md` §3 specifies the Prisma schema's `datasource` block with
`url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")` declared
directly in `schema.prisma`. Installing `prisma`/`@prisma/client` without a
version pin resolved to **Prisma 7**, which removed `url`/`directUrl` from
the schema file entirely — Prisma 7 requires connection URLs to move to a
separate `prisma.config.ts` file, passed via an `adapter`/`accelerateUrl`
option to `PrismaClient`, instead.

## Problem

`npx prisma validate` fails outright on Prisma 7 against the schema shape
`ARCHITECTURE.md` documents (`P1012`: "The datasource property `url` is no
longer supported in schema files").

## Options considered

1. **Adopt Prisma 7** — migrate to `prisma.config.ts` + a driver adapter,
   diverging from `ARCHITECTURE.md`'s documented schema shape.
2. **Pin Prisma 6** — keep `schema.prisma` exactly as `ARCHITECTURE.md`
   specifies it.

## Decision

Option 2. Pinned `prisma@^6` and `@prisma/client@^6` in `package.json`.

## Why this option was chosen

Same principle as [ADR-0001](0001-pin-nextjs-14-tailwind-v3.md): this
project is in its very first hours, and adopting Prisma 7's new
config-file model unprompted — on day one, for a database that isn't even
provisioned yet — would be scope creep on top of an already-large Week 1
task list, and would silently diverge from the documented schema without
Max having made that call.

## Trade-offs

- Miss Prisma 7's improvements to the config/adapter model.
- Same erosion risk as ADR-0001: any future `npm install prisma@latest`
  silently breaks this. Must stay pinned deliberately.

## Future review conditions

- Revisit alongside the Next/Tailwind major-version upgrade (ADR-0001),
  since both represent the same category of "modernize the toolchain"
  work and are cheaper to do together.
- Revisit sooner if Prisma 6 is formally EOL'd, or if a Prisma-7-only
  feature (e.g. a specific driver adapter) becomes necessary once the real
  Supabase database is provisioned.
