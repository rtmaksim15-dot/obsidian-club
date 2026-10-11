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

/** mediaUrls is stored as Prisma Json (an array of bare paths post-backfill) — narrowed and resolved here, once.
 *  Superseded by resolvePostImages() below (Phase C) for anything written after multi-photo posts shipped —
 *  kept only because a handful of legacy call sites may still reference it; new code should not add new callers. */
export async function resolvePostMediaUrls(mediaUrls: unknown): Promise<string[]> {
  if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) return [];
  const resolved = await getSignedUrls(
    "post-photos",
    mediaUrls.filter((u): u is string => typeof u === "string"),
  );
  return resolved.filter((u): u is string => Boolean(u));
}

export type PostImageRow = {
  id: string;
  storagePath: string;
  position: number;
  width: number | null;
  height: number | null;
};

export type ResolvedPostImage = {
  id: string;
  url: string;
  position: number;
  width: number | null;
  height: number | null;
};

// Multi-photo posts, Phase C (2026-10-10, see DECISIONS.md) — the
// read path for Post.images (PostImage[]), replacing
// resolvePostMediaUrls() above for every post going forward
// (including every historical post, whose single photo was backfilled
// into a position-0 PostImage row by the migration — there's no dual
// read path to maintain). Drops an image outright if its path fails to
// sign (deleted/missing object), same "never show a broken image"
// posture resolvePostMediaUrls() already had.
export async function resolvePostImages(images: PostImageRow[]): Promise<ResolvedPostImage[]> {
  if (images.length === 0) return [];
  const urls = await getSignedUrls("post-photos", images.map((img) => img.storagePath));
  return images
    .map((img, i) => (urls[i] ? { id: img.id, url: urls[i]!, position: img.position, width: img.width, height: img.height } : null))
    .filter((img): img is ResolvedPostImage => img !== null);
}
