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

// "Recent REP Changes" / "REP History" list on /hall and
// /profile/[username] (own profile only, both pages) — split off
// REP_NUMBER_ENABLED (2026-09-29, explicit call: showing exactly what
// earns REP — "Daily login +5", "7-day login streak +50" — cheapens the
// number itself into a reward for opening the app, not a reputation
// score). The REP number stays visible under REP_NUMBER_ENABLED alone;
// this only hides the itemized ledger under it. RepHistory rows and
// every awardRep() call site keep writing exactly as before — nothing
// here touches earning, only what's rendered.
export const REP_HISTORY_UI_ENABLED = false;

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

// Navigation v2 (Phase B, 2026-10-10, see DECISIONS.md) — search isn't
// built yet (no query/index behind it); gates the top bar's search
// icon only. Default false until a real search exists to search.
export const SEARCH_UI_ENABLED = false;

// Navigation v2, THE WORLD drawer (Phase B) — each of these four gates
// one drawer row for a feature that doesn't exist yet at all (no model,
// no route). Default false; turning one on before its feature is built
// will 404 — these exist so the drawer's rows can ship ahead of each
// feature and be turned on independently later, same pattern as
// LIBRARY_UI_ENABLED/HOUSES_UI_ENABLED above.
export const CHRONICLES_UI_ENABLED = false;
export const CIRCLES_UI_ENABLED = false;
export const GATHERINGS_UI_ENABLED = false;
export const ATLAS_UI_ENABLED = false;

// Navigation v2, MINE menu (Phase B) — "Seal of Authenticity" and "My
// Boundaries" rows. "Seal of Authenticity" still doesn't exist (no
// model, no route) — stays off. "My Boundaries" shipped (Package 4,
// Phase A, 2026-10-13, see DECISIONS.md): /boundaries,
// lib/dm/boundaries.ts, wired into getRequestEligibility/
// getMessageButtonState — flipped on.
export const SEAL_UI_ENABLED = false;
export const BOUNDARIES_UI_ENABLED = true;

// Hide Newcomer Path + Practices (founder decision, 2026-10-22, see
// DECISIONS.md) — "too much load for members." Both shipped working
// (Package 5, Phase A and Package 4, Phase B respectively) and are
// turned off here rather than removed: every underlying table/row
// (UserProfile.settings.newcomerPath, practice_tags, user_practices)
// stays exactly as it is, nothing is migrated or deleted.

// Gates: "THE PATH OF THE INITIATE" card on /feed, and — the one real
// behavioral change, not just a rendering gate — lib/newcomer-path/
// status.ts#syncNewcomerPath() itself now returns null immediately
// while this is false, before touching the database at all, so no
// NEWCOMER_* REP is awarded while the flag is off (no silent awards
// accruing out of sight). REP already awarded before this flipped off
// is untouched — this only gates future awards, never reverses past
// ones, same as every other UI_ENABLED flag in this file leaves its
// underlying data alone.
export const NEWCOMER_PATH_ENABLED = false;

// Gates: the practices editor (the 23-row curated list + "Who can see
// this") on /profile/edit, the "My limits"/"I practise"/"Curious
// about" rows on /profile/[username], and GET/PATCH
// /api/profile/practices (both now 404 while this is false — the
// underlying lib/profile/practices.ts functions and the
// practice_tags/user_practices tables are untouched, just not served).
export const PRACTICES_UI_ENABLED = false;

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — discreet push
// notifications for the PWA, built fully but shipped off by default
// ahead of the Nov 1 launch. While false: no permission prompt is ever
// requested (the settings page itself 404s, same as every other
// hidden-behind-a-flag page in this file), no PushSubscription row is
// ever created, and lib/push/send.ts#sendPush() returns before
// touching the database or calling web-push at all — mirrors
// NEWCOMER_PATH_ENABLED's own "the gate is the first statement, not a
// rendering afterthought" shape two flags above.
export const PUSH_ENABLED = false;

