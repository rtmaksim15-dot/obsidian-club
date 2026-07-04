import { redirect } from "next/navigation";
import type { PostType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canCreatePostType } from "@/lib/rating/content-rights";
import ContentComposer from "@/components/shared/ContentComposer";
import LikeButton from "@/components/shared/LikeButton";

const FEED_TYPES: PostType[] = ["post", "story"];
const LIBRARY_TYPES: PostType[] = ["article", "lecture", "course", "manifesto"];
const ALL_TYPES: PostType[] = ["post", "story", "article", "lecture", "manifesto", "course"];

const TYPE_LABELS: Record<PostType, string> = {
  post: "Post",
  story: "Story",
  article: "Article",
  lecture: "Lecture",
  manifesto: "Manifesto",
  course: "Course",
};

/**
 * Content (`/content`), v0.6 — real feed + library, replacing the "coming
 * soon" placeholder. "Feed" is posts/stories (the ephemeral timeline);
 * "Library" is the curated, level-gated content types (articles, lectures,
 * courses, manifestos) — see PRODUCT.md §10.
 */
export default async function ContentPage({
  searchParams,
}: {
  searchParams: { view?: string; type?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/content");

  const isLibrary = searchParams.view === "library";
  const activeType =
    isLibrary && searchParams.type && LIBRARY_TYPES.includes(searchParams.type as PostType)
      ? (searchParams.type as PostType)
      : undefined;
  const types = activeType ? [activeType] : isLibrary ? LIBRARY_TYPES : FEED_TYPES;

  const posts = await prisma.post.findMany({
    where: { isPublished: true, minLevel: { lte: user.level }, type: { in: types } },
    orderBy: { publishedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      content: true,
      type: true,
      likesCount: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
      likes: { where: { userId: user.id }, select: { userId: true } },
      _count: { select: { comments: true } },
    },
  });

  const allowedTypes = ALL_TYPES.filter((t) => canCreatePostType(user, t));

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-6">Content</h1>

        <div className="mb-8 flex gap-4">
          <a href="/content" className={`text-caption ${!isLibrary ? "text-ob-accent" : ""}`}>
            Feed
          </a>
          <a href="/content?view=library" className={`text-caption ${isLibrary ? "text-ob-accent" : ""}`}>
            Library
          </a>
        </div>

        {isLibrary ? (
          <div className="mb-8 flex flex-wrap gap-3">
            <a href="/content?view=library" className={`text-caption ${!activeType ? "text-ob-accent" : ""}`}>
              All
            </a>
            {LIBRARY_TYPES.map((t) => (
              <a
                key={t}
                href={`/content?view=library&type=${t}`}
                className={`text-caption ${activeType === t ? "text-ob-accent" : ""}`}
              >
                {TYPE_LABELS[t]}
              </a>
            ))}
          </div>
        ) : null}

        <ContentComposer allowedTypes={allowedTypes} />

        {posts.length === 0 ? (
          <p className="text-body">Nothing here yet.</p>
        ) : (
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
        )}
      </div>
    </main>
  );
}
