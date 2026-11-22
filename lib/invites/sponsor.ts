// Sponsor tracking for admin vetting (2026-11-22, see DECISIONS.md) —
// a member can share their own referralCode with a prospective
// applicant ahead of the application form (?sponsor=<code> on the
// invitation panel's one fixed URL). Admin-only context for reviewing
// the application; NOT the public referral program CLAUDE.md keeps
// permanently off (no rewards, no REP, no counts, never shown to
// other members). Used by the public POST /api/applications route, so
// this lives alongside the other invite-matching helpers rather than
// under lib/admin, which is reserved for admin-only code paths.
export function normalizeSponsorCode(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}
