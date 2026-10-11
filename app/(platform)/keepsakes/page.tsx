import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { feedPostSelect } from "@/lib/feed/query";
import { resolveAvatarUrls, resolvePostImages } from "@/lib/storage/resolve-media";
import { getBlockedEitherWayUserIds } from "@/lib/moderation/block";
import { getVeilEnabled } from "@/lib/profile/veil";
import PostList, { type FeedPost } from "@/components/shared/PostList";

// Keepsakes (Phase B, B5, 2026-10-10, see DECISIONS.md) — "only if the
// underlying feature (bookmarks/likes) exists." There's no Bookmark
// model in this schema, but Like already does: this is "posts you've
// liked," ordered by when you liked them, not when they were posted —
// no new model, no migration.
export default async function KeepsakesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/keepsakes");

  const blockedUserIds = await getBlockedEitherWayUserIds(user.id);

  const likes = await prisma.like.findMany({
    where: { userId: user.id, post: { isPublished: true, authorId: { notIn: blockedUserIds } } },
    orderBy: { createdAt: "desc" },
    select: { post: { select: { ...feedPostSelect, likes: { where: { userId: user.id }, select: { userId: true } } } } },
  });

  const avatarUrls = await resolveAvatarUrls(likes.map((l) => l.post.author.avatarUrl));
  const [posts, veilEnabled] = await Promise.all([
    Promise.all(
      likes.map(async (l, i) => ({
        ...l.post,
        images: await resolvePostImages(l.post.images),
        author: { ...l.post.author, avatarUrl: avatarUrls[i] },
      })),
    ),
    getVeilEnabled(user.id),
  ]);

  return (
    <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <p className="text-label mb-2">Mine</p>
        <h1 className="text-h1 mb-6">Keepsakes</h1>
        <PostList
          posts={posts as FeedPost[]}
          viewerId={user.id}
          viewerIsAdmin={user.isAdmin}
          viewerVeilEnabled={veilEnabled}
        />
      </div>
    </main>
  );
}
