import { randomBytes } from "crypto";

/** Short, URL-safe, sufficiently-unique referral code. Collisions are
 *  handled by the caller via the DB's unique constraint + retry, not here. */
export function generateReferralCode() {
  return randomBytes(5).toString("hex"); // 10 hex chars
}

/**
 * A first-pass username derived from an email, since the application form
 * doesn't collect one (see TECH_DEBT.md) — members are expected to change
 * it during profile setup. Not guaranteed unique on its own; the caller
 * must still handle a unique-constraint collision.
 */
export function generateUsernameFromEmail(email: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  const suffix = randomBytes(2).toString("hex");
  return `${base || "member"}-${suffix}`;
}
