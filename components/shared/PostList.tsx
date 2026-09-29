import PostCard, { type FeedPost } from "./PostCard";

export type { FeedPost };

/** Thin wrapper over `PostCard` for /feed and /hall — same flat,
 *  divided rendering (see PostCard), just a different filter feeding
 *  it. No extra gap between items — each PostCard's own bottom border
 *  is the only separator, Threads-style. */
type Props = {
  posts: FeedPost[];
  compact?: boolean;
  viewerId?: string;
  viewerIsAdmin?: boolean;
  // Only a caller with its own client-side list (FeedList) passes this —
  // see ContentMenu's onDeleted comment. Callers that render straight
  // from a Server Component (e.g. /hall) leave it unset; there's no
  // local array there to go stale, so ContentMenu's router.refresh()
  // fallback is already correct.
  onPostDeleted?: (postId: string) => void;
};

export default function PostList({ posts, compact = false, viewerId, viewerIsAdmin, onPostDeleted }: Props) {
  if (posts.length === 0) {
    return <p className="text-body">Nothing here yet.</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          compact={compact}
          viewerId={viewerId}
          viewerIsAdmin={viewerIsAdmin}
          onDeleted={onPostDeleted ? () => onPostDeleted(post.id) : undefined}
        />
      ))}
    </div>
  );
}
