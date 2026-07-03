# ADR-0013: Initiation Ritual step 4 ("introduce yourself in the newcomers' room") is auto-satisfied pending Rooms

**Status:** Accepted
**Date:** 2026-07-02

## Context

`PRODUCT.md` §1 Stage 2 specifies a mandatory 5-step Initiation Ritual
gating Level I access: (1) complete profile, (2) accept the Code of
Conduct, (3) view Lord Obsidian's intro material, (4) introduce yourself
in the newcomers' room, (5) confirm safety/respect rules. `v0.3` builds
the actual ritual (deferred from `v0.2`, see
[ADR](0012-waitlist-status-tracking.md) history / `DECISIONS.md`). Rooms
don't exist as a feature until `v0.4` (`BACKLOG.md`).

## Problem

Step 4 requires posting into a room that cannot exist yet — there is no
honest way to make a member "actually" complete this step in `v0.3`.

## Options considered

1. **Fake it** — silently mark step 4 complete without the member doing
   anything. Rejected outright: this is exactly the kind of invented
   business logic the project's engineering rules forbid — the ritual
   would silently not mean what `PRODUCT.md` says it means.
2. **Block the whole ritual on step 4** — no one can reach Level I /
   the Hall until Rooms exist (`v0.4`). Rejected: this blocks the entire
   membership funnel on an unrelated feature landing, which has no
   basis in any source doc and would make `v0.2`'s already-shipped
   admin-approval flow pointless in practice.
3. **Explicitly defer step 4** — mark it with a distinct sentinel value
   (not `true`, not silently skipped) meaning "not yet applicable,"
   surfaced honestly in the ritual UI, and revisit it once Rooms exist.

## Decision

Option 3. `UserProfile.ritualProgress` stores step 4 as
`"newcomerRoom": "deferred"` (not `true`) — visually distinct in the
ritual UI from a genuinely completed step, with copy explaining why. The
overall ritual is considered complete when steps 1/2/3/5 are `true` and
step 4 is either `true` or `"deferred"`.

## Why this option was chosen

It's the only option that's both honest (nothing is faked; the ritual UI
tells the member exactly what's real and what's pending) and doesn't
block the membership funnel on an unrelated feature (`v0.4` Rooms). The
`"deferred"` sentinel, not a plain boolean, means this is trivially
findable later — a database query for `newcomerRoom = 'deferred'` finds
every member who still needs to actually do this once Rooms ship.

## Trade-offs

- The ritual, as experienced in `v0.3`, is not the ritual `PRODUCT.md`
  fully describes — a real product-fidelity gap, not just a technical
  one. Documented prominently (this ADR, `TECH_DEBT.md`,
  `docs/UX.md`'s implementation status) rather than left implicit.
- Requires a follow-up pass once Rooms ship (`v0.4`) to retroactively
  route existing members through a real "introduce yourself" flow — not
  automatic, someone has to remember to build it.

## Future review conditions

- **Must** be revisited when Rooms ship (`v0.4`): decide whether existing
  members with `newcomerRoom: "deferred"` are prompted retroactively, or
  whether the deferral is simply honored permanently for anyone who
  joined before Rooms existed. This is a product decision for Max, not
  something to default silently either direction.
