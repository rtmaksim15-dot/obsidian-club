# Philosophy

> Source: transcribed from `CLAUDE.md` §11, 13; `PRODUCT.md` §1, 3–6;
> `DESIGN.md` §1 (Max's strategic package, kept in iCloud). Same rule as
> [Vision.md](Vision.md): if this page and the source docs disagree, the
> source docs are correct.

## The one sentence everything else follows from

> "I didn't just register. I was granted access."

Every screen, every button, every unit of spacing should make the user feel
this. When in doubt about a product or design decision, this is the
tie-breaker.

## This is not a social network

Obsidian Club is not a place you sign up for — it's a place you're let into.
Membership isn't purchased; it's earned, extended, and, when it must be,
withdrawn.

Everything rests on four things: **reputation, rating, influence, and
trust**. These are not numbers to farm — they're the record of how a person
conducts themselves, who they bring in, and what they give.

## Invitation is an act of responsibility

A member's referral is not a casual growth mechanic. The people you invite
reflect on you:

- If someone you invited grows and contributes well, you gain rating.
- If they break the rules, you lose points.
- If they're removed from the club, it's a serious hit to your Trust Score.

This is enforced structurally (see the referral/Trust Chain mechanics in
[UX.md](UX.md)), not just stated as a value.

## The Purge principle

Every 6–12 months, membership is reviewed. Members with low ratings receive
a warning, lose access to parts of the platform, get moved to inactive
status, and — ultimately — can be removed.

> "If a person brings no value to the club, the club no longer brings value
> to them."

## Design philosophy (visual/interaction expression of the above)

Obsidian Club is not an app. It is a place. Every screen should read as:

- a dark, premium library
- a closed club with a long history
- a private audience with something larger than yourself
- belonging to a chosen circle

**Explicitly forbidden:** bright colors, playful animation, mass-market
aesthetics, "startup" energy, Bootstrap templates, standard SaaS UI.
**References:** Rolls-Royce's website, the Soho House app, private-banking
UI, premium watch brands. See [UI.md](UI.md) for how this is encoded as
actual tokens and components in this codebase.

## What this means for engineering decisions

When a technical trade-off is ambiguous, prefer the option that:

1. Keeps the "granted access, not registered" feeling intact for the user.
2. Doesn't compromise the closed/premium/dark visual identity.
3. Doesn't invent product mechanics that aren't in the source docs — flag
   the gap instead (see the Development Rule in [docs/README.md](README.md)).
