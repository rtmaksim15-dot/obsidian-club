"use client";

import { useState } from "react";
import PostList, { type FeedPost } from "./PostList";

type Props = { initialPosts: FeedPost[]; initialHasMore: boolean; viewerId?: string; viewerIsAdmin?: boolean };

/**
 * /feed with real pagination (Block 5, August hardening pass,
 * 2026-08-05) — the feed previously had a hard `take: 30` ceiling with
 * no way to see anything published before that. "Load more" rather
 * than infinite scroll: simplest correct fix, matches this app's other
 * list views (no infinite-scroll pattern exists anywhere else in the
 * codebase to be consistent with).
 */
export default function FeedList({ initialPosts, initialHasMore, viewerId, viewerIsAdmin }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed?skip=${posts.length}`);
      if (!res.ok) {
        setError("Could not load more posts.");
        return;
      }
      const body = await res.json();
      setPosts((prev) => [...prev, ...body.posts]);
      setHasMore(body.hasMore);
    } catch {
      setError("Could not load more posts.");
    } finally {
      setLoading(false);
    }
  }

  // Instant removal on delete (2026-09-29, see DECISIONS.md) — `posts`
  // lives in this component's own state (`useState(initialPosts)`
  // above), so ContentMenu's `router.refresh()` fallback silently no-ops
  // here: refresh() re-renders this component with a fresh
  // `initialPosts` prop, but `useState`'s initializer only runs on first
  // mount, so the deleted post stayed on screen until a hard reload.
  // Splicing it out of local state the moment the DELETE actually
  // succeeds (not before — ContentMenu only calls this after `res.ok`)
  // fixes that without needing a rollback path.
  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  return (
    <div>
      <PostList posts={posts} viewerId={viewerId} viewerIsAdmin={viewerIsAdmin} onPostDeleted={handlePostDeleted} />
      {hasMore ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button type="button" className="btn-secondary" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
          {error ? (
            <p className="text-caption" style={{ color: "var(--color-error)" }}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
