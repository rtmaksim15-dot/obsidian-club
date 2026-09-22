import "server-only";
import { createAdminClient } from "@/lib/auth/supabase-admin";

// Private-storage read path (task 2, 2026-09-23, see DECISIONS.md) —
// post-photos and avatars are both private buckets now; every read
// goes through a short-lived signed URL minted server-side by the
// service-role client (which bypasses RLS by design), never the old
// permanent public URL. 15 minutes: every page these run from is
// server-rendered per request already (confirmed in the plan this
// implements), so a fresh URL mints on every reload regardless — a
// longer TTL buys nothing, much shorter risks expiring mid-session.
export const SIGNED_URL_TTL_SECONDS = 15 * 60;

/** null in, null out — callers pass a possibly-null path straight through without an extra branch. */
export async function getSignedUrl(bucket: string, path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error(`[signed-url] Failed to sign ${bucket}/${path}:`, error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Batched — one Storage API call for many paths, not one per path (a
 * feed page or member list resolving 20-50 avatars one at a time would
 * otherwise add that many serial round trips to a single render). Nulls
 * and duplicates in `paths` are filtered before the call and mapped
 * back onto every original entry afterward, so the returned array is
 * always the same length, same order, as the input.
 */
export async function getSignedUrls(bucket: string, paths: (string | null)[]): Promise<(string | null)[]> {
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (uniquePaths.length === 0) return paths.map(() => null);

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    console.error(`[signed-url] Failed to batch-sign ${uniquePaths.length} paths in ${bucket}:`, error);
    return paths.map(() => null);
  }

  const byPath = new Map(data.map((d) => [d.path, d.signedUrl ?? null]));
  return paths.map((p) => (p ? (byPath.get(p) ?? null) : null));
}
