import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import PostCard from "@/components/shared/PostCard";
import CommentSection from "@/components/shared/CommentSection";

// Post detail (`/posts/[id]`) — Feed & Posts MVP, 2026-07-16. Same
// gating as the feed itself (isPublished + minLevel); a post outside the
// caller's reach 404s rather than teasing it, matching /api/posts.
export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/posts/${params.id}`);

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      content: true,
      mediaUrls: true,
      type: true,
      minLevel: true,
      isPublished: true,
      likesCount: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true, level: true, rep: true } },
      house: { select: { id: true, name: true, slug: true } },
      likes: { where: { userId: user.id }, select: { userId: true } },
      _count: { select: { comments: true } },
    },
  });
  if (!post || !post.isPublished || post.minLevel > user.level) notFound();

  const comments = await prisma.comment.findMany({
    where: { postId: post.id, isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { id: true, displayName: true, avatarUrl: true, level: true } },
    },
  });

  return (
    <main className="min-h-screen bg-ob-black px-6 py-16 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <PostCard
          post={post}
          linkComments={false}
          viewerId={user.id}
          viewerIsAdmin={user.isAdmin}
          deleteRedirectTo="/feed"
        />

        <section className="mt-8">
          <CommentSection
            postId={post.id}
            initial={comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))}
          />
        </section>
      </div>
    </main>
  );
}
