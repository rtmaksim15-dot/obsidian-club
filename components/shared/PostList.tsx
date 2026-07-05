import type { PostType } from "@prisma/client";
import LikeButton from "./LikeButton";

const TYPE_LABELS: Record<PostType, string> = {
  post: "Post",
  story: "Story",
  article: "Article",
  lecture: "Lecture",
  manifesto: "Manifesto",
  course: "Course",
};

export type FeedPost = {
  id: string;
  title: string | null;
  content: string | null;
  type: PostType;
  likesCount: number;
  author: { id: string; displayName: string; avatarUrl: string | null; level: number };
  likes: { userId: string }[];
  _count: { comments: number };
};

/** Shared post-card rendering for /feed and /library — same card, just a
 *  different `type` filter feeding it (see PostType). */
export default function PostList({ posts }: { posts: FeedPost[] }) {
  if (posts.length === 0) {
    return <p className="text-body">Nothing here yet.</p>;
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article key={post.id} className="card">
          <div className="mb-3 flex items-center gap-3">
            <div className={`avatar avatar-level-${post.author.level} h-9 w-9 shrink-0`}>
              {post.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
                  {post.author.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-data">{post.author.displayName}</p>
              <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                {TYPE_LABELS[post.type]}
              </p>
            </div>
          </div>

          {post.title ? <p className="text-h2 !text-lg mb-2">{post.title}</p> : null}
          <p className="text-body whitespace-pre-wrap">{post.content}</p>

          <div className="mt-4 flex items-center gap-5">
            <LikeButton postId={post.id} initialCount={post.likesCount} initialLiked={post.likes.length > 0} />
            <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
              {post._count.comments} comments
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
