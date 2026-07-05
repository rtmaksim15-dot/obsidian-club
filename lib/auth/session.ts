import { createClient } from "./supabase-server";
import { prisma } from "@/lib/db/prisma";
import { touchDailyLogin } from "@/lib/rating/rep-engine";

/**
 * Current authenticated member, joined against this app's own `User` row
 * (not just the Supabase Auth session) — null if not logged in, or if a
 * Supabase session exists but has no matching `users` row yet (shouldn't
 * happen in normal flow, see ADR-0010's UUID-sync note; treated as
 * logged-out rather than throwing).
 */
export async function getCurrentUser() {
  // Supabase isn't provisioned yet in this environment (see TECH_DEBT.md).
  // Treat "not configured" the same as "not logged in" rather than
  // throwing — middleware.ts already fail-closes protected routes to
  // /login in this state, but this guard protects any future caller that
  // checks auth status outside a protected route.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });

  // Daily-login REP (CLAUDE.md, 2026-07-05) — a non-critical side effect,
  // never allowed to fail the actual auth check. `getCurrentUser` can run
  // more than once per page load; `touchDailyLogin` is written to be
  // safe under that.
  if (user) {
    touchDailyLogin(user.id).catch((err) =>
      console.error("[session] Failed to touch daily-login streak:", err),
    );
  }

  return user;
}
