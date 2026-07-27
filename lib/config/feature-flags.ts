// v1 is feed-first (OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md, 2026-07-27):
// REP-facing UI — badges, /vault unlocks, /hall & /profile REP history,
// admin REP adjustments — is deferred out of v1, not deleted. The
// earning/ledger logic in lib/rating/rep-engine.ts (REP_TABLE, awardRep,
// every award call site) keeps running untouched; this only gates what's
// rendered. Flip to true when REP surfaces are ready to ship.
export const REP_UI_ENABLED = false;

// Roadmap §V: "the word 'Houses' is temporarily removed from the
// interface." Gates browse (/houses, /houses/[slug]), join (button +
// the POST /api/houses/[slug]/join route itself, same page+API pairing
// REP_UI_ENABLED uses for /admin/rep), the composer's house-tagging
// dropdown, PostCard's house pill, and the profile page's Houses
// section. Does NOT touch the Newcomers' room (`Room.type ===
// "newcomers"`) — that's a Room, not a House, and it's a required
// Initiation Ritual step; unaffected by this flag entirely. Underlying
// HouseMembership data/queries and REP_TABLE.earn.houseJoined keep
// working if triggered — nothing left to trigger them while join is
// gated, which is the point.
export const HOUSES_UI_ENABLED = false;

// Roadmap §V: "Gold, достижения, уровни" (levels) — a separate system
// from REP_UI_ENABLED, gated by User.reputation (peer-review stars),
// not User.rep (see DECISIONS.md, 2026-07-25). Gates the level-name
// label (Initiate/Keeper/.../Council) and the "Your Next Level"
// progress section on /hall and /profile/[username], plus the
// avatar-level-N border styling everywhere an avatar renders — falls
// back to the base .avatar border with no level distinction. Does NOT
// touch canCreatePostType's level-gating of post types (article/
// lecture/course) — that's a permission check, not a displayed
// "levels" concept, and keeps working silently either way. Achievement
// grants (lib/utils/achievements.ts) were never displayed anywhere in
// the UI to begin with — nothing to gate there.
export const LEVELS_UI_ENABLED = false;
