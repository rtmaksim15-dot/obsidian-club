import { redirect } from "next/navigation";
import type { PostType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canCreatePostType } from "@/lib/rating/content-rights";
import ContentComposer from "@/components/shared/ContentComposer";
import PostList from "@/components/shared/PostList";

const LIBRARY_TYPES: PostType[] = ["article", "lecture", "course", "manifesto"];

const TYPE_LABELS: Record<PostType, string> = {
  post: "Post",
  story: "Story",
  article: "Article",
  lecture: "Lecture",
  manifesto: "Manifesto",
  course: "Course",
};

/**
 * Library (`/library`) — CLAUDE.md's (2026-07-05) nav tab 4: "courses,
 * books, wellness content." Scoped here to the curated content types
 * this codebase actually has (article/lecture/course/manifesto, gated
 * per PRODUCT.md §10) — split out of the old `/content` page, see
 * ADR-0015. Real books/wellness-service listings aren't built (those are
 * separate `OC_MASTER.md` product-ecosystem items — see BACKLOG.md).
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/library");

  const activeType =
    searchParams.type && LIBRARY_TYPES.includes(searchParams.type as PostType)
      ? (searchParams.type as PostType)
      : undefined;
  const types = activeType ? [activeType] : LIBRARY_TYPES;

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

  const allowedTypes = LIBRARY_TYPES.filter((t) => canCreatePostType(user, t));
  const houses = await prisma.house.findMany({
    where: { status: "active" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Community</p>
        <h1 className="text-h1 mb-6">Library</h1>

        <div className="mb-8 flex flex-wrap gap-3">
          <a href="/library" className={`text-caption ${!activeType ? "text-ob-accent" : ""}`}>
            All
          </a>
          {LIBRARY_TYPES.map((t) => (
            <a
              key={t}
              href={`/library?type=${t}`}
              className={`text-caption ${activeType === t ? "text-ob-accent" : ""}`}
            >
              {TYPE_LABELS[t]}
            </a>
          ))}
        </div>

        <ContentComposer allowedTypes={allowedTypes} houses={houses} />

        <PostList posts={posts} />
      </div>
    </main>
  );
}
