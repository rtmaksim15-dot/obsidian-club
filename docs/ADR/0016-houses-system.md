# ADR-0016: Adopt the Houses System, House of Rope as Phase 1; The Vault fully replaces Shop

**Status:** Accepted (partial — see Open Questions)
**Date:** 2026-07-09

## Context

The restored `CLAUDE.md` (2026-07-08) introduces a "Houses System":
thematic verticals within the club, each with its own culture, content,
and products — Phase 1 named specifically as **House of Rope**
(shibari/kinbaku). It also introduces **The Vault**, replacing the
"Shop" concept: access to exclusive content/products opens through
reputation (REP), not a direct purchase.

Neither concept came with a concrete data model or catalog — same shape
of gap as prior pivots (see ADR-0014, ADR-0015): a real strategic
concept, no invented specifics to back it.

## Decision

**Houses.** Added a `House` model (`name`, `slug`, `tagline`,
`description`, `status`: `active`/`coming_soon`), with `houseId` FKs on
`Room` and `Post` so a house can have both a community space and tagged
content. Seeded exactly one house — House of Rope — with only what Max
actually specified (name, "Shibari / Kinbaku" tagline). Built `/houses`
(list, "coming soon" houses shown not hidden) and `/houses/[slug]`
(room + tagged content). The other 8 houses CLAUDE.md mentions as
examples (leather, protocol, impact, etc.) are **not** seeded — no
names are decided yet.

Later, Max asked for House of Rope's real content directly: "описание,
что такое шибари, первые материалы для участников." Wrote
`House.description` plus two real articles authored as Lord Obsidian:
"What Is Shibari?" (general cultural/historical overview — safe,
factual, non-instructional) and "Getting Started in House of Rope" (a
safety-first orientation: consent/communication, never practice alone,
keep safety shears at hand, nerve/circulation awareness, and an explicit
recommendation to seek qualified in-person instruction). **Deliberately
did not write actual rope-tying technique instructions** — that's
exactly the kind of expert-vetted, safety-critical material this
project defers to Max (or a real instructor), same standing rule as the
Initiation Ritual's safety-rules content.

Then, a content-tagging UI: `ContentComposer.tsx` gained a house picker
(shown once at least one active House exists), and `POST /api/posts`
validates the optional `houseId`. Members with content-creation rights
can now tag their own posts to House of Rope directly, not just via
`prisma/seed.ts`.

**The Vault.** Max resolved this directly: **"The Vault полностью
заменяет Shop. Shop убираем."** — a full replacement, not a rename in
name only. `/shop` was deleted; `/vault` (honest "coming soon" →
later, real mechanic) took its place; `BottomNav.tsx`'s "Shop" tab is
now "Vault" (`lucide-react`'s `Vault` icon). Built a `VaultItem` model
(`name`, `description`, `minRep`, `isActive`) — deliberately no
`price`/`currency`, which is what actually distinguishes it from the
older `MarketplaceItem` (kept as-is; whether it's retired too is still
open). `/vault` gates each real item on `user.rep >= item.minRep`,
locked items shown visibly (same pattern as Rooms/Houses). `POST
/api/admin/vault-items` lets Max create real items once he defines a
catalog — none are seeded.

## Consequences

- `docs/Vision.md`/`UX.md`/`Architecture.md` should eventually reflect
  Houses/Vault as first-class concepts; not yet fully synced (tracked in
  `TECH_DEBT.md`).
- `MarketplaceItem` vs `VaultItem`: whether the older model gets
  retired is still an open question — Max's instruction was specifically
  about Shop, not that model.
- Signature Rope Collection (numbered/certificated limited collections
  with a transfer registry): not started, no design exists yet.
