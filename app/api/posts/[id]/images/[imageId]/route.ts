import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { requireAgeVerifiedApi } from "@/lib/age-verification/gate";
import { errCode } from "@/lib/utils/safe-error";

// DELETE /api/posts/:id/images/:imageId (C6) — author-only, soft-delete
// a single image from their own post; the post and any other images
// stay exactly as they are. Won't remove the last remaining image from
// a photo-only post (no title/content) — that would leave a fully
// empty post still published, the same "Post can't be empty" rule
// POST /api/posts already enforces at creation.
export async function DELETE(_request: Request, { params }: { params: { id: string; imageId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  const ageBlocked = requireAgeVerifiedApi(user);
  if (ageBlocked) return ageBlocked;

  const image = await prisma.postImage.findUnique({
    where: { id: params.imageId },
    include: { post: { select: { id: true, authorId: true, content: true } } },
  });
  if (!image || image.postId !== params.id) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
  if (image.post.authorId !== user.id) {
    return NextResponse.json({ error: "You can only remove images from your own posts." }, { status: 403 });
  }
  if (image.isDeleted) {
    return NextResponse.json({ ok: true });
  }

  if (!image.post.content?.trim()) {
    const remaining = await prisma.postImage.count({ where: { postId: image.postId, isDeleted: false } });
    if (remaining <= 1) {
      return NextResponse.json(
        { error: "Can't remove the only image from a photo-only post." },
        { status: 422 },
      );
    }
  }

  try {
    await prisma.postImage.update({ where: { id: image.id }, data: { isDeleted: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[posts/images] Failed to remove image:", errCode(err));
    return NextResponse.json({ error: "Could not remove the image. Try again shortly." }, { status: 503 });
  }
}
