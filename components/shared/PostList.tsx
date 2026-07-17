import PostCard, { type FeedPost } from "./PostCard";

export type { FeedPost };

/** Thin wrapper over `PostCard` for /feed and /library — same card
 *  rendering, just a different `type`/house filter feeding it. */
export default function PostList({ posts }: { posts: FeedPost[] }) {
  if (posts.length === 0) {
    return <p className="text-body">Nothing here yet.</p>;
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
