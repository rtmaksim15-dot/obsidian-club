# Obsidian Club — Documentation

This is the engineering documentation for Obsidian Club. It is the as-built,
living counterpart to the original product/brand specification.

## Development Rule: Documentation Is the Single Source of Truth

If the code and the documentation disagree, **the documentation wins** —
until it's explicitly changed. Concretely:

- If you (human or AI) find implementation that contradicts what's written
  here or in the source docs below, **stop**. Don't silently "fix" the code
  to match your assumption, and don't silently update the doc to match the
  code.
- **Report the conflict** to the project owner (Max) and **ask for
  clarification** before proceeding.
- **Never invent business logic.** If a product decision isn't documented
  anywhere (Vision/Philosophy/UX/PRODUCT.md/etc.), that's a gap to flag, not
  a blank to fill in with a guess.

## Relationship to the original source docs

Before this framework existed, Max's strategic package
(`CLAUDE.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `DESIGN.md`,
`CONTENT_SYSTEM.md`, `ROADMAP.md` — kept outside this repo, in iCloud) was
the only source of truth, and still defines product intent, brand, and
long-range plan. This `/docs` tree is the **engineering-facing, in-repo,
as-built** counterpart:

- The iCloud package = what Max specified the product to be.
- `/docs` = what's actually built, why it was built that way, and where it
  has knowingly diverged from spec (always via a linked ADR, never silently).

Where `/docs/Vision.md`, `Philosophy.md`, and `UX.md` restate product intent,
they're transcribed from the iCloud source docs, not reinterpreted — if
something here looks inconsistent with those docs, that's a bug in this
documentation, not a new decision.

## Map of the documentation

| File | Purpose | Who updates it, when |
|---|---|---|
| [Vision.md](Vision.md) | What Obsidian Club is and why it exists | Rarely — only when the product's core premise changes |
| [Philosophy.md](Philosophy.md) | The values/tone the product must embody | Rarely |
| [LordObsidian.md](LordObsidian.md) | Canonical persona spec — appearance, voice, values, symbolism | Rarely — when Max provides new brand/character material |
| [Architecture.md](Architecture.md) | Actual current technical architecture (stack, data model, folder layout) | Every version that changes the architecture |
| [UX.md](UX.md) | User journeys and product mechanics (levels, reputation, referrals, rituals) | When product mechanics are added/changed |
| [UI.md](UI.md) | Practical design-token and component reference for this codebase | When the design system changes |
| [API/](API/) | One file per resource/endpoint, plus conventions | Every version that adds/changes an API |
| [ADR/](ADR/) | One file per significant *technical* decision (format, options, trade-offs) | Whenever such a decision is made |
| [../CHANGELOG.md](../CHANGELOG.md) | What shipped, by version, Keep-a-Changelog format | Every completed version |
| [../DECISIONS.md](../DECISIONS.md) | Chronological log of *all* product + engineering decisions (links out to ADRs for technical depth) | Whenever a decision is made, technical or not |
| [../TECH_DEBT.md](../TECH_DEBT.md) | Known compromises, temporary implementations, future cleanup | As debt is taken on or paid down |
| [../BACKLOG.md](../BACKLOG.md) | Now / Next / Later work, organized by product version | As work is planned — items only move between columns with Max's approval |

**Quick rule of thumb for where to write something:**
- Explaining *why* we chose a technical approach → **ADR**
- Recording *that* a decision (technical or not) was made and when → **DECISIONS.md**
- Recording *what* shipped in a release → **CHANGELOG.md**
- Recording a shortcut we knowingly took → **TECH_DEBT.md**
- Recording work we haven't done yet → **BACKLOG.md**

## Versioning

From this point forward, work is organized by **product version**, not by
calendar week. Pattern: `v0.1` = Landing, `v0.2` = Authentication, `v0.3` =
Profile, `v0.4` = Community, `v0.5` = Reputation, etc. — pre-1.0 versions are
iterative builds toward the public launch; `v1.0` is the January 2027 launch
described in `ROADMAP.md`. `CHANGELOG.md` follows [Semantic
Versioning](https://semver.org/); every completed version updates the
changelog, and touches ADR/`Architecture.md` if it changed the architecture.
