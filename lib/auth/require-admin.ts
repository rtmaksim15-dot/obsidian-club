import { getCurrentUser } from "./session";

/** Returns the current user if they're an admin, otherwise null. Callers
 *  (API routes, pages) decide how to respond (403 vs redirect). */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return null;
  return user;
}
