// Membership eligibility age (2026-09-24, see DECISIONS.md): raised from
// 18 to 21. This is the only number that means "old enough to become an
// Obsidian Club member" — every eligibility checkbox, consent line, and
// application check reads from here, never a restated literal.
export const MIN_MEMBER_AGE = 21;

// Legal definition of "minor" for child-safety purposes — the Report
// category "underage", RL-I in the Code of Conduct, and NCMEC reporting
// all key off this, and it does NOT move when MIN_MEMBER_AGE changes.
// It's a separate, externally-fixed legal threshold (who counts as a
// minor at all), not a product decision about who this club accepts —
// the two numbers happened to both be 18 before this change and must
// never be silently coupled again.
export const CHILD_SAFETY_MIN_AGE = 18;
