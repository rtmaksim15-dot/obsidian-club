import { randomBytes } from "crypto";

/** Short, URL-safe, sufficiently-unique referral code. Collisions are
 *  handled by the caller via the DB's unique constraint + retry, not here. */
export function generateReferralCode() {
  return randomBytes(5).toString("hex"); // 10 hex chars
}

/**
 * A first-pass username derived from an email — a placeholder, not a
 * real choice. The application form doesn't collect one (see
 * TECH_DEBT.md), and as of the Username-in-the-Ritual step
 * (2026-08-06) new members are *required*, not just "expected," to
 * replace this with a deliberate pick before the ritual's profile step
 * can complete (lib/auth/ritual.ts). Underscore, not hyphen — must stay
 * within the same `^[a-z0-9_]{3,20}$` format PATCH /api/profile
 * enforces for a real choice, in case this placeholder is ever read
 * back before it's replaced. Not guaranteed unique on its own; the
 * caller must still handle a unique-constraint collision.
 */
export function generateUsernameFromEmail(email: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 14);
  const suffix = randomBytes(2).toString("hex"); // 4 hex chars
  return `${base || "member"}_${suffix}`; // max 14 + 1 + 4 = 19 chars
}

/** Opaque single-use invite/partner token (Invitation & Partner system
 *  v1, 2026-08-01) — same entropy as the original invite token, which
 *  was inlined as `randomBytes(24).toString("hex")` in
 *  app/api/admin/applications/[id]/route.ts; centralized here since
 *  this is now the third call site needing one. */
export function generateInviteToken() {
  return randomBytes(24).toString("hex");
}
