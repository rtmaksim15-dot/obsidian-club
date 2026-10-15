// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md),
// item 8 — the per-account lockout decision itself, as a pure one-line
// function. Trivial on its own, but named and tested explicitly (rather
// than an inline `>=` at each of its two call sites — POST /api/auth/
// sign-in, POST /api/auth/mfa/verify) so "is this account locked out"
// is one well-known rule, not two copies that could quietly diverge.
export function isAccountLockedOut(recentFailureCount: number, maxFailures: number): boolean {
  return recentFailureCount >= maxFailures;
}
