import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/auth/supabase-admin";

// Feed & Posts MVP (2026-07-16): a single optional photo per post,
// stored in Supabase Storage (not UploadThing, which the avatar flow
// already uses — Max's task named Supabase Storage specifically). One
// public bucket, since post photos are meant to be visible to whoever
// can already see the post itself; access control lives in the app
// (Post.minLevel / house membership), not in Storage.
//
// Rewritten 2026-07-29 (v1 bug fix): this used to accept the file body
// directly and proxy it to Storage via the service-role client. Real
// production photos routinely failed with "Could not upload photo" —
// traced to Vercel's hard 4.5MB request-body cap on Serverless
// Functions (FUNCTION_PAYLOAD_TOO_LARGE), which our own 8MB app-level
// check never got a chance to enforce since the platform rejected the
// request first. Confirmed the Storage side itself (bucket, size
// limit, permissions) was fine by uploading directly against the real
// project — the file simply never made it past Vercel's function body
// limit for anything much over ~4MB, which ordinary phone photos
// routinely exceed.
//
// Fix: this route no longer receives file bytes at all. It hands back
// a short-lived signed upload URL/token; the browser uploads the file
// straight to Supabase Storage (bypassing the Vercel function body
// entirely), then the client sends the resulting public URL along with
// the rest of the post. Supabase's own bucket-level `fileSizeLimit`
// (8MB, set below) is what actually enforces the size cap now — a
// signed upload is still subject to it, just not to Vercel's.
const BUCKET = "post-photos";
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
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_TYPES),
  });
}

type Body = { filename?: string; contentType?: string; size?: number };

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.contentType || !ALLOWED_TYPES.has(body.contentType)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." }, { status: 422 });
  }
  if (typeof body.size !== "number" || body.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 8MB or smaller." }, { status: 422 });
  }

  const admin = createAdminClient();
  await ensureBucket(admin);

  // Extension derived from the validated Content-Type, not the
  // client-supplied filename (August hardening pass, Block 2,
  // 2026-08-04) — the actual bytes are verified separately, at post
  // creation time, in app/api/posts/route.ts (see that route's
  // comment for why it can't happen here).
  const ext = EXT_BY_TYPE[body.contentType] ?? "jpg";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) {
    console.error("[posts/photo] Could not create signed upload URL:", error);
    return NextResponse.json({ error: "Could not start photo upload. Try again shortly." }, { status: 503 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json(
    { bucket: BUCKET, path, token: data.token, publicUrl: pub.publicUrl },
    { status: 201 },
  );
}
