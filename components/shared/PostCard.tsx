import type { PostType } from "@prisma/client";
import LikeButton from "./LikeButton";
import ReportButton from "./ReportButton";
import DeletePostButton from "./DeletePostButton";
import { REP_UI_ENABLED, HOUSES_UI_ENABLED, LEVELS_UI_ENABLED } from "@/lib/config/feature-flags";

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

type Props = {
  post: FeedPost;
  linkComments?: boolean;
  compact?: boolean;
  // Member protection mechanics (pre-launch legal package, 2026-08-09)
  // — computed client-side from `viewerId`/`viewerIsAdmin` rather than
  // baked into `FeedPost` at the query layer, so every existing
  // `postSelect` shape across /feed, /hall, /posts/[id], /houses/[slug],
  // and profile stays untouched. Both default to "logged out, not
  // admin," which safely shows neither control.
  viewerId?: string;
  viewerIsAdmin?: boolean;
  // /posts/[id] needs this — deleting the post you're currently viewing
  // in full leaves nothing to refresh back to.
  deleteRedirectTo?: string;
};

/** Shared post-card rendering for /feed, /hall, /profile/[username], and
 *  /posts/[id] — the detail page just omits `linkComments` since the
 *  thread is already right there. Flat Threads-style as of the
 *  2026-07-29 nav redesign: no card border/background, a subtle
 *  divider between posts (see PostList).
 *
 *  `compact` drops the avatar/name header — for "Your Posts" on /hall,
 *  where the owner's own avatar and name are already shown once at the
 *  top of the page; repeating them per-post was pure redundancy. */
export default function PostCard({
  post,
  linkComments = true,
  compact = false,
  viewerId,
  viewerIsAdmin = false,
  deleteRedirectTo,
}: Props) {
  const photo = firstPhoto(post.mediaUrls);
  const isOwn = viewerId != null && post.author.id === viewerId;
  const canDelete = isOwn || (viewerId != null && viewerIsAdmin);
  const canReport = viewerId != null && !isOwn;
  const timestamp = new Date(post.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const commentsLabel = `${post._count.comments} ${post._count.comments === 1 ? "comment" : "comments"}`;

  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {compact ? null : <p className="text-data">{post.author.displayName}</p>}
          <span className="text-caption" style={{ color: "var(--color-text-muted)" }}>
            {timestamp}
          </span>
          {REP_UI_ENABLED ? (
            <span className="text-caption" style={{ color: "var(--color-gold)" }}>
              {post.author.rep} REP
            </span>
          ) : null}
        </div>

        {post.house && HOUSES_UI_ENABLED ? (
          <a
            href={`/houses/${post.house.slug}`}
            className="text-caption shrink-0 rounded-ob border px-2 py-1 uppercase tracking-brand"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            {post.house.name}
          </a>
        ) : null}
      </div>

      {post.title ? <p className="text-h2 !text-lg mt-1">{post.title}</p> : null}
      <p className="text-body mt-1 whitespace-pre-wrap">{post.content}</p>

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" loading="lazy" className="mt-3 max-h-[480px] w-full rounded-ob object-cover" />
      ) : null}

      <div className="mt-3 flex items-center gap-5">
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
        {canDelete ? <DeletePostButton postId={post.id} redirectTo={deleteRedirectTo} /> : null}
        {canReport ? <ReportButton targetType="post" targetId={post.id} /> : null}
      </div>
    </div>
  );

  if (compact) {
    return (
      <article className="py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        {body}
      </article>
    );
  }

  return (
    <article className="flex gap-3 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
      <div className={`avatar h-9 w-9 shrink-0 ${LEVELS_UI_ENABLED ? `avatar-level-${post.author.level}` : ""}`}>
        {post.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.author.avatarUrl} alt={post.author.displayName} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-ob-surface text-sm">
            {post.author.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {body}
    </article>
  );
}
