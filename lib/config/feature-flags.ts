// v1 is feed-first (OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md, 2026-07-27):
// REP-facing UI — badges, /vault unlocks, /hall & /profile REP history,
// admin REP adjustments — is deferred out of v1, not deleted. The
// earning/ledger logic in lib/rating/rep-engine.ts (REP_TABLE, awardRep,
// every award call site) keeps running untouched; this only gates what's
// rendered. Flip to true when REP surfaces are ready to ship.
export const REP_UI_ENABLED = false;
