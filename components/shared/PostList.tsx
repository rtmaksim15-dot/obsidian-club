import PostCard, { type FeedPost } from "./PostCard";

export type { FeedPost };

/** Thin wrapper over `PostCard` for /feed and /hall — same flat,
 *  divided rendering (see PostCard), just a different filter feeding
 *  it. No extra gap between items — each PostCard's own bottom border
 *  is the only separator, Threads-style. */
export default function PostList({ posts, compact = false }: { posts: FeedPost[]; compact?: boolean }) {
  if (posts.length === 0) {
    return <p className="text-body">Nothing here yet.</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} compact={compact} />
      ))}
    </div>
  );
}
