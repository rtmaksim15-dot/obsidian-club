import { getCurrentUser } from "./session";
import { createClient } from "./supabase-server";

/**
 * Returns the current user if they're an admin AND their session has
 * completed TOTP MFA (aal2) — otherwise null. Callers (API routes,
 * pages) decide how to respond; every one of them already treats null
 * as "act like this admin doesn't exist" (403 or notFound()), which is
 * exactly right here too — item 2 (2026-09-17, see DECISIONS.md) wants
 * a non-admin and an admin-without-aal2 to be indistinguishable from
 * outside, both a plain 404 on /admin.
 *
 * Every existing admin page and API route already calls this single
 * function — the aal2 check lives here, once, rather than needing to be
 * added to each of them individually.
 *
 * IMPORTANT — sequencing: this enforces aal2 unconditionally the moment
 * it deploys. An admin who hasn't enrolled a TOTP factor yet will see
 * this return null (404 on /admin) until they do — enroll at
 * /account/security, which is reachable at aal1 specifically so this
 * isn't a lockout with no way out.
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") return null;

  return user;
}
