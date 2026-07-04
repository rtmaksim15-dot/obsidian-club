# ADR-0014: Adopt OC_MASTER.md as the strategic source of truth; keep the existing technical foundation

**Status:** Accepted
**Date:** 2026-07-04

## Context

On 2026-07-04, Max delivered `files.zip` (in the iCloud docs folder) containing
`OC_MASTER.md` and a revised `CLAUDE.md`, both dated July 2026 and explicitly
self-described: *"This document is the single source of truth for Obsidian
Club. Updated as decisions are made."* This is a materially different
strategic direction from the original 6-file package (`CLAUDE.md`,
`PRODUCT.md`, `ARCHITECTURE.md`, `DESIGN.md`, `CONTENT_SYSTEM.md`,
`ROADMAP.md`, all dated 2026-06-29) that this repository's `v0.1`-`v0.5` was
built against.

Investigating further surfaced that the iCloud folder actually contains
**three distinct, mutually-inconsistent document lineages**, not two:

- **Lineage A** (2026-06-29 + a same-era precursor,
  `Gpt Obsidian_Club_Architecture_v1.0_Full.pdf`): the original 6-file
  package. Waitlist-form entry, simple merch/ticket marketplace, Level
  I-VI naming (Initiate...Council), Next.js/Prisma/Supabase stack. **This
  is what `v0.1`-`v0.5` were built against.**
- **Lineage B** (2026-06-27 drafts: `Obsidian Club TZ v1.docx`,
  `Obsidian Codex.docx`/`v2`, `Obsidian UserJourney Onboarding v1.docx`,
  and `Obsidian Club Master v2.docx` synthesizing them): purchase-order
  verification (`OBS-XXXXXX`) as the primary/only entry gate, a two-layer
  Open/Inner Circle access model, a Circle/Warden/Steward/Keeper/Envoy
  role hierarchy used as the actual access-level enum, a React +
  Express + JWT + S3 stack, specific rating weights (35/25/15/15/10) that
  differ from Lineage A's (30/20/15/20/10/5, already implemented in
  `v0.5`'s `rating-engine.ts`), and — critically — native iOS/Android via
  React Native as a planned phase.
- **Lineage C** (`files.zip`, 2026-07-04): `OC_MASTER.md` + revised
  `CLAUDE.md`. Three entry paths (product purchase, member referral,
  manual review of the first 1000 — no waitlist-form framing at all), an
  entirely new product ecosystem (physical BDSM accessories up to
  $20k-$100k, a practitioner-services marketplace, paid courses, book
  sales, mental-health-professional booking), a four-tier subscription
  model, AI-first moderation, and an explicit, reasoned decision:
  **no native iOS/Android app, PWA only** (App Store policy risk for 18+
  content) — directly contradicting Lineage B's React Native phase.

## Problem

Three "authoritative-sounding" documents disagree on fundamentals
(entry model, tech stack, native apps, rating weights, level naming).
Proceeding on any of them without Max's explicit call would mean
guessing at which one actually reflects current intent — exactly the
kind of business-logic invention this project's engineering rules
forbid.

## Options considered (asked directly, not guessed)

1. **Lineage C (`OC_MASTER.md`) is authoritative**, superseding Lineage
   A/B on any point of conflict.
2. **Lineage B (`Obsidian Club Master v2.docx`) is authoritative** —
   more technically detailed, though older.
3. **Neither** — request a fresh, single consolidated document.

Separately, once (1) was chosen: what happens to the `v0.1`-`v0.5`
technical build (Next.js/Prisma/Supabase, the waitlist/admin-approval
flow, the Hall, Rooms, and the reputation/rating engine), since
`OC_MASTER.md` never mentions implementation technology at all?

1. **Keep the existing build as the foundation**, layer `OC_MASTER.md`'s
   new strategic elements on top in future versions.
2. **Replace the entry model immediately** with `OC_MASTER.md`'s
   purchase/referral paths, keeping Hall/Rooms/Reputation as-is.
3. Pause for a full replan before touching anything further.

## Decision

**Lineage C (`OC_MASTER.md` + the revised `CLAUDE.md`) is the strategic
source of truth going forward**, superseding Lineage A/B wherever they
conflict. **The existing technical foundation is kept** — Next.js 14,
Tailwind v3, Prisma 6, Supabase Auth, and everything built through
`v0.5` (waitlist/admin-approval, Hall, Rooms + real-time chat,
reputation/rating engine) remain valid and are not being torn out.
`OC_MASTER.md`'s new elements (purchase-triggered invites, direct
member-to-member referral without admin review, the physical-goods/
marketplace/courses/mental-health ecosystem, subscription tiers) are
**additive future scope**, not an immediate rebuild — see `BACKLOG.md`.
The existing waitlist/admin-approval flow is reframed as
`OC_MASTER.md`'s **"Path 3 — Manual Review (First 1000)"**, one of three
entry paths rather than the only one.

## Why this option was chosen

Max's own explicit statement in `OC_MASTER.md` ("single source of
truth... updated as decisions are made") is a direct, first-person
claim to authority that neither Lineage A nor B makes as explicitly.
Presented as a genuine choice rather than assumed, given the scale of
what was at stake (potentially discarding five shipped versions).
Keeping the existing technical foundation avoids destroying validated,
working infrastructure over a strategic document that never actually
contradicts *how* the app is built — only *what else* it should
eventually do and *how members initially get in*.

## Trade-offs

- `docs/UX.md`'s member-level naming (Initiate/Member/Senior
  Member/Mentor/Master/Council Member, from Lineage A's `PRODUCT.md`)
  and `lib/rating/rating-engine.ts`'s weights (from Lineage A's
  `ARCHITECTURE.md` §5) are **not** contradicted by `OC_MASTER.md`
  (which leaves level names "TBD" and doesn't specify rating weights at
  all) — kept as-is for now, but they came from a now-superseded
  document, not from Lineage C directly. If Max finalizes different
  level names or weights later, that's a normal, expected update, not a
  reversal of this ADR.
- The purchase-verification and direct-referral entry paths
  (`OC_MASTER.md`'s Paths 1 and 2) are **not implemented** — there is no
  product catalog, no order-verification API, and no admin-free
  referral-to-registration flow yet. Building these requires real
  specification (product data model, payment flow, fraud/abuse
  handling) that doesn't exist yet in Lineage C's high-level bullet
  points — tracked in `BACKLOG.md` as scope needing further definition,
  not something to guess at.
- `Obsidian Codex.docx`'s actual prose (club philosophy, six rules, "The
  Club's Promise") is well-written, on-brand content that could resolve
  the Initiation Ritual's long-standing content gap (steps 2/5, see
  [ADR-0013](0013-initiation-ritual-step4-deferred.md)) — but it was
  authored as part of Lineage B, alongside a hierarchy/access model
  Max didn't confirm as current. Reusing the *prose* without adopting
  Lineage B's *system* is a separate, smaller question, flagged
  separately rather than decided here.

## Future review conditions

- Revisit before starting any work on `OC_MASTER.md`'s new product
  verticals (physical goods, marketplace, courses, mental health,
  subscriptions) — each needs its own real specification pass (likely
  its own ADR) before implementation, not a jump straight to code.
- Revisit if Max provides a newer, dated document that itself claims to
  be "the single source of truth" — same pattern as this one, handle
  the same way (stop, compare, ask, don't guess).

## 2026-07-04 clarification — Lineage B was never a competing spec

Max clarified directly: Lineages A/B's satellite documents (`TZ v1`,
`Codex`, `Master v2.docx`, `UserJourney Onboarding`, and the other
brand/narrative PDFs in the folder) are **idea-processing drafts** —
raw brainstorming, not documents that were ever meant to compete for
authority the way this ADR's "three lineages" framing implied.
`OC_MASTER.md` + the revised `CLAUDE.md` are the **deliberate output**
of a working session between Max and Claude (the strategic-planning
counterpart, distinct from Claude Code) specifically to produce
instructions for Claude Code — i.e., for this repo. This doesn't change
the decision above (`OC_MASTER.md` authoritative, existing build kept),
but it simplifies the mental model: there's one instruction set, not a
contest between two. The open question about reusing `Obsidian
Codex.docx`'s actual prose (Code of Conduct text) for the Initiation
Ritual is unaffected by this and remains genuinely open — good writing
salvaged from a brainstorming draft is a different question from
whether the draft's system design is canon.
