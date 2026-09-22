import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/auth/supabase-admin";
import { detectImageSignature } from "@/lib/utils/validateImageBytes";
import { stripExifIfPresent } from "@/lib/utils/stripExif";
import { resolveAvatarUrl } from "@/lib/storage/resolve-media";

// User Profiles task (2026-07-17): replaces the old UploadThing avatar
// flow (never actually verifiable — UPLOADTHING_SECRET/APP_ID were
// never provisioned, see TECH_DEBT.md) with Supabase Storage, same
// lazy-bucket pattern as post photos (app/api/posts/photo/route.ts).
// Separate bucket from post-photos since avatars are a distinct,
// per-user-singular concept, not per-post.
const BUCKET = "avatars";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

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

  // Block 2 (August hardening pass, 2026-08-04): `file.type` above is
  // just a client-supplied label — trivially spoofable, not a sniff of
  // the actual bytes. Check the real file signature before this reaches
  // Storage, so an SVG/HTML payload declared as "image/jpeg" can't get
  // through. See lib/utils/validateImageBytes.ts.
  const rawBytes = Buffer.from(await file.arrayBuffer());
  const realType = detectImageSignature(rawBytes);
  if (!realType) {
    return NextResponse.json({ error: "This file doesn't look like a valid image." }, { status: 422 });
  }

  // Explicit, server-side EXIF/GPS removal (task 3, 2026-09-22, see
  // DECISIONS.md) — stripped against the byte-sniffed real type, not
  // the client-declared `file.type`, and unconditionally, so a caller
  // that skips the client-side compressImage() step entirely still
  // can't get raw EXIF (including GPS) into Storage. See
  // lib/utils/stripExif.ts for exactly what is and isn't covered.
  const bytes = stripExifIfPresent(rawBytes, realType);

  const admin = createAdminClient();
  await ensureBucket(admin);

  // Extension derived from the validated MIME type, not the
  // client-supplied filename (also part of this hardening pass) — the
  // filename was previously trusted as-is for the Storage path.
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  // Fixed path per user (not timestamped, unlike post photos) — an
  // avatar is a single slot that gets overwritten, not an accumulating
  // gallery, so `upsert` replaces the previous file at the same path
  // instead of leaving orphaned objects in Storage.
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: true,
  });
  if (uploadError) {
    console.error("[profile/avatar] Upload failed:", uploadError);
    return NextResponse.json({ error: "Could not upload avatar. Try again shortly." }, { status: 503 });
  }

  // Private storage (task 2, 2026-09-23, see DECISIONS.md) — only the
  // bare path is stored from here on; a fresh signed URL is resolved on
  // every read (lib/storage/resolve-media.ts), never a stored permanent
  // one. The old "?v=<timestamp>" cache-bust suffix on the public URL
  // is no longer needed for the same reason: a signed URL's token/query
  // string is already unique on every mint, even for this same fixed
  // per-user path.
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: path } });

  return NextResponse.json({ avatarUrl: await resolveAvatarUrl(path) }, { status: 201 });
}
