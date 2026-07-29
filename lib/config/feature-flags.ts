// v1 is feed-first (OBSIDIAN_ROADMAP_v3.0_The_Feed_First.md, 2026-07-27):
// REP-facing UI — badges, /vault unlocks, /hall & /profile REP history,
// admin REP adjustments — is deferred out of v1, not deleted. The
// earning/ledger logic in lib/rating/rep-engine.ts (REP_TABLE, awardRep,
// every award call site) keeps running untouched; this only gates what's
// rendered. Flip to true when REP surfaces are ready to ship.
//
// Extended 2026-07-29: also gates the Reputation-stars (`User.reputation`)
// and Trust Score stats on /hall — Max's own framing was "this is REP/
// reputation UI that must be behind the disabled flags," i.e. these were
// a gap in this flag's original coverage (it only checked `User.rep`,
// the discrete point ledger) rather than a separate concept needing its
// own flag. The underlying reputation average / Trust Score fields and
// their recalculation (lib/rating/rating-engine.ts,
// referral-lifecycle.ts) keep updating silently either way.
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

// Roadmap §III/§IV: v1 is feed-first — "building now" names the feed,
// post creation, comments, and people search; Library (articles/
// lectures/courses/manifestos) isn't in that list. Same shape as
// REP_UI_ENABLED/HOUSES_UI_ENABLED: the route and nav tab stay, real
// content is replaced with a minimal teaser. Doesn't touch post
// creation rights (lib/rating/content-rights.ts) or the underlying
// `Post` rows — only what /library renders. The two House of Rope demo
// articles seeded 2026-07-09 were separately unpublished (isPublished:
// false) rather than just relying on this flag, since they reference a
// deferred House and don't fit the launch content policy regardless of
// when Library UI ships — see TECH_DEBT.md, DECISIONS.md 2026-07-27.
export const LIBRARY_UI_ENABLED = false;

// v1 is feed-first — Max's direct instruction (2026-07-29): hide the
// "Your Invitation" referral-link/stats block on /hall for v1, since
// "referrals are deferred." Distinct from the core invite-only entry
// mechanism (admin-approval → one-time invite link, ROADMAP.md §IV
// "already working, keep, don't touch") — this only gates the
// referral-stats display and the queries that solely feed it
// (Referral.count, the ?ref= link). Referral resolution on approval,
// Trust Score's referral-activation bonus, and
// lib/rating/referral-lifecycle.ts's transitions all keep running
// untouched; there's just nothing left in the UI pointing a member at
// their own referral link/count while this is off.
export const REFERRALS_UI_ENABLED = false;
