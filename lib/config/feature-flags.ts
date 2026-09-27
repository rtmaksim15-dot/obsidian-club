// REP number split (2026-09-27, see DECISIONS.md) — this used to be one
// flag (`REP_UI_ENABLED`) covering the REP number, the reputation-stars
// average, Trust Score, and the reviews form/list all at once. Turning
// REP on for real surfaced that these are independent product
// decisions — reviews aren't ready yet, but the REP number and level
// are. Split into REP_NUMBER_ENABLED (this), REVIEWS_UI_ENABLED, and
// TRUST_SCORE_UI_ENABLED below so each can flip independently.
//
// Gates: the REP number on /hall and /profile/[username] (both), the
// "Recent REP Changes" / "REP History" list (own profile only, both
// pages), and /admin/rep + POST /api/admin/rep-adjustment (an admin
// tool to hand-correct a number that's now actually visible). Does NOT
// gate the REP badge on feed post cards (components/shared/PostCard.tsx)
// — deliberately removed from there entirely, not flagged: "the feed is
// about content, not the author's score" (Max, 2026-09-27) reads as a
// permanent product stance, not a "later" toggle. The earning/ledger
// logic in lib/rating/rep-engine.ts (REP_TABLE, awardRep, every award
// call site) keeps running untouched regardless of this flag — it only
// gates what's rendered.
export const REP_NUMBER_ENABLED = true;

// Reputation-stars (`User.reputation`, the peer-review average) + the
// "Leave a Review" form + the "Reviews" list — a separate mechanic from
// REP_NUMBER_ENABLED above, launching later (2026-09-27 split). Gates
// the stars/REP line's star half on /profile/[username], the review
// form, and the reviews list. The underlying `Review` rows and
// `reputation` field recalculation keep working either way — nothing
// writes them yet since the form that would create one is hidden.
export const REVIEWS_UI_ENABLED = false;

// Trust Score (`User.trustScore`) on /hall's status card — was bundled
// into the old REP_UI_ENABLED (2026-07-29 extension) with no product
// decision behind showing it specifically; splitting REP out (2026-09-27)
// is a chance to gate it on its own rather than defaulting it on by
// association. lib/rating/referral-lifecycle.ts's Trust Score
// recalculation keeps running untouched regardless.
export const TRUST_SCORE_UI_ENABLED = false;

// The Vault (`/vault`) — real REP-spending mechanic, was gated on the
// old REP_UI_ENABLED purely because nothing else existed to gate it on.
// Kept off on its own flag now that REP display has shipped (2026-09-27,
// explicit call: "не трогаем") — turning the REP number on doesn't
// imply turning Vault on. /vault shows its existing "Under construction"
// teaser while this is false, same as before.
export const VAULT_UI_ENABLED = false;

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
// from REP, gated by User.reputation (peer-review stars), not User.rep
// (see DECISIONS.md, 2026-07-25). Gates the level-name label
// (Initiate/Keeper/.../Council) and the avatar-level-N border styling
// everywhere an avatar renders (falls back to the base .avatar border
// with no level distinction) — on /hall, /profile/[username], and
// PostCard. Does NOT touch canCreatePostType's level-gating of post
// types (article/lecture/course) — that's a permission check, not a
// displayed "levels" concept, and keeps working silently either way.
// Achievement grants (lib/utils/achievements.ts) were never displayed
// anywhere in the UI to begin with — nothing to gate there.
//
// The "Your Next Level" progress section used to live under this same
// flag; split out to LEVEL_PROGRESS_UI_ENABLED below (2026-09-27) — see
// that flag's comment for why.
export const LEVELS_UI_ENABLED = true;

// "Your Next Level" progress bar on /hall — split off LEVELS_UI_ENABLED
// (2026-09-27, explicit call: turning the level name/avatar ring on
// doesn't mean the progress checklist should turn on too). With every
// real member currently at Level 1, `referralCount` at 0 across the
// board, and no Review rows yet to move `reputation` off 0, the
// checklist would render zero met criteria for literally everyone —
// "looks like a broken promise," not an honest empty state. Revisit
// once at least one of those numbers moves. getLevelProgress() itself
// (lib/rating/level-progress.ts) and checkLevelUp() keep running
// regardless — this only gates the rendered checklist on /hall.
export const LEVEL_PROGRESS_UI_ENABLED = false;

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

// Community tab hidden for v1 (2026-09-27): with only Newcomers active,
// /rooms is an empty-feeling single-room list for anyone past the
// ritual — worse than not showing a nav destination at all. Gates only
// the BottomNav/DesktopNav tab; the /rooms and /rooms/[slug] routes,
// the Newcomers room itself, and the Initiation Ritual's "Go to the
// Newcomers room" step (app/(platform)/ritual/page.tsx, which links
// straight to /rooms/newcomers, not through this nav) are untouched.
// Flip back to true once there's enough membership for Community to
// carry its own weight.
export const COMMUNITY_UI_ENABLED = false;
