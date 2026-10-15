import { NextResponse } from "next/server";
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

/**
 * Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md) —
 * the API-route counterpart to requireAdmin() above, for the one thing
 * pages don't need and routes do: a real, distinguishable status code.
 * requireAdmin() collapses "not logged in," "logged in but not admin,"
 * and "admin but not aal2 yet" into one null, which every page is
 * right to treat identically (notFound() — item 2, 2026-09-17's own
 * obscurity reasoning: a stranger and an admin-without-MFA should look
 * the same from outside). An API route doesn't have that luxury if a
 * test (or a real client) needs to tell "you're not signed in at all"
 * (401) apart from "you're signed in, but not for this" (403) — so this
 * duplicates the same isAdmin+aal2 check (not `requireAdmin()` itself,
 * to avoid a second getCurrentUser()/Supabase round trip per request)
 * and returns a ready-to-return NextResponse instead of leaving every
 * one of the ~22 admin routes to reinvent its own status-code choice.
 *
 * Deliberately only two outcomes beyond success: a true 401 for "no
 * session at all," and 403 for every other rejection (non-admin, or
 * admin without a currently-aal2 session) — not aal2-less admins also
 * at 401, which would let an API response alone confirm an email
 * belongs to an admin account. The separate 12h-step-up/30m-idle
 * freshness check (admin-stepup-policy.ts) runs earlier, in
 * middleware.ts, for both pages and API routes under /admin and
 * /api/admin — by the time a request reaches here, that gate has
 * already passed or the request never arrived.
 */
export type RequireAdminApiResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; response: NextResponse };

export async function requireAdminApi(): Promise<RequireAdminApiResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  if (!user.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") {
    return { ok: false, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }

  return { ok: true, user };
}
