import "server-only";
import { getSignedUrl, getSignedUrls } from "./signed-url";

// Thin, bucket-scoped wrappers around signed-url.ts (task 2, 2026-09-23,
// see DECISIONS.md) — every call site that renders an avatar or a post
// photo goes through one of these two, so "which bucket" and "what a
// missing/legacy value resolves to" are decided in exactly one place.
export function resolveAvatarUrl(avatarPath: string | null): Promise<string | null> {
  return getSignedUrl("avatars", avatarPath);
}

export function resolveAvatarUrls(avatarPaths: (string | null)[]): Promise<(string | null)[]> {
  return getSignedUrls("avatars", avatarPaths);
}

/** mediaUrls is stored as Prisma Json (an array of bare paths post-backfill) — narrowed and resolved here, once. */
export async function resolvePostMediaUrls(mediaUrls: unknown): Promise<string[]> {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return [];
  const resolved = await getSignedUrls(
    "post-photos",
    mediaUrls.filter((u): u is string => typeof u === "string"),
  );
  return resolved.filter((u): u is string => Boolean(u));
}
