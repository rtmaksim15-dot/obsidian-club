import { randomBytes } from "crypto";

/** Short, URL-safe, sufficiently-unique referral code. Collisions are
 *  handled by the caller via the DB's unique constraint + retry, not here. */
export function generateReferralCode() {
  return randomBytes(5).toString("hex"); // 10 hex chars
}

/** Opaque single-use invite/partner token (Invitation & Partner system
 *  v1, 2026-08-01) — same entropy as the original invite token, which
 *  was inlined as `randomBytes(24).toString("hex")` in
 *  app/api/admin/applications/[id]/route.ts; centralized here since
 *  this is now the third call site needing one. */
export function generateInviteToken() {
  return randomBytes(24).toString("hex");
}
