import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/auth/supabase-admin";

// User Profiles task (2026-07-17): replaces the old UploadThing avatar
// flow (never actually verifiable — UPLOADTHING_SECRET/APP_ID were
// never provisioned, see TECH_DEBT.md) with Supabase Storage, same
// lazy-bucket pattern as post photos (app/api/posts/photo/route.ts).
// Separate bucket from post-photos since avatars are a distinct,
// per-user-singular concept, not per-post.
const BUCKET = "avatars";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await admin.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return;
  await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 422 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 422 });
  }

  const admin = createAdminClient();
  await ensureBucket(admin);

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  // Fixed path per user (not timestamped, unlike post photos) — an
  // avatar is a single slot that gets overwritten, not an accumulating
  // gallery, so `upsert` replaces the previous file at the same path
  // instead of leaving orphaned objects in Storage.
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) {
    console.error("[profile/avatar] Upload failed:", uploadError);
    return NextResponse.json({ error: "Could not upload avatar. Try again shortly." }, { status: 503 });
  }

  // Cache-bust: the public URL is otherwise identical across re-uploads
  // (fixed path), so a browser/CDN cache would keep showing the old image.
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl }, { status: 201 });
}
