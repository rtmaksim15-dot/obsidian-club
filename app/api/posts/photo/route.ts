import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/auth/supabase-admin";

// Feed & Posts MVP (2026-07-16): a single optional photo per post,
// stored in Supabase Storage (not UploadThing, which the avatar flow
// already uses — Max's task named Supabase Storage specifically). One
// public bucket, since post photos are meant to be visible to whoever
// can already see the post itself; access control lives in the app
// (Post.minLevel / house membership), not in Storage.
const BUCKET = "post-photos";
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
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (uploadError) {
    console.error("[posts/photo] Upload failed:", uploadError);
    return NextResponse.json({ error: "Could not upload photo. Try again shortly." }, { status: 503 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
