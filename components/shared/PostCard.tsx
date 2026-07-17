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
  mediaUrls: unknown;
  likesCount: number;
  createdAt: string | Date;
  author: { id: string; displayName: string; avatarUrl: string | null; level: number; rep: number };
  house: { id: string; name: string; slug: string } | null;
  likes: { userId: string }[];
  _count: { comments: number };
};

function firstPhoto(mediaUrls: unknown): string | null {
  return Array.isArray(mediaUrls) && typeof mediaUrls[0] === "string" ? mediaUrls[0] : null;
}

/** Shared post-card rendering for /feed, /library, and /posts/[id] — the
 *  detail page just omits `linkComments` since the thread is already
 *  right there. */
export default function PostCard({ post, linkComments = true }: { post: FeedPost; linkComments?: boolean }) {
  const photo = firstPhoto(post.mediaUrls);
  const timestamp = new Date(post.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const commentsLabel = `${post._count.comments} ${post._count.comments === 1 ? "comment" : "comments"}`;

  return (
    <article className="card">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
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
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-data">{post.author.displayName}</p>
              <span className="text-caption" style={{ color: "var(--color-gold)" }}>
                {post.author.rep} REP
              </span>
            </div>
            <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
              {TYPE_LABELS[post.type]} · {timestamp}
            </p>
          </div>
        </div>

        {post.house ? (
          <a
            href={`/houses/${post.house.slug}`}
            className="text-caption shrink-0 rounded-ob border px-2 py-1 uppercase tracking-brand"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            {post.house.name}
          </a>
        ) : null}
      </div>

      {post.title ? <p className="text-h2 !text-lg mb-2">{post.title}</p> : null}
      <p className="text-body whitespace-pre-wrap">{post.content}</p>

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="mt-4 max-h-[480px] w-full rounded-ob object-cover" />
      ) : null}

      <div className="mt-4 flex items-center gap-5">
        <LikeButton postId={post.id} initialCount={post.likesCount} initialLiked={post.likes.length > 0} />
        {linkComments ? (
          <a href={`/posts/${post.id}`} className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            {commentsLabel}
          </a>
        ) : (
          <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            {commentsLabel}
          </span>
        )}
      </div>
    </article>
  );
}
