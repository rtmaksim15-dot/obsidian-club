import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getFeedPosts } from "@/lib/feed/query";

// GET /api/feed?skip=N — "load more" pagination for /feed (Block 5,
// August hardening pass, 2026-08-05). Shares its query with the
// server-rendered initial page load (lib/feed/query.ts) so the two can
// never disagree about what belongs in the feed.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const skip = Number(searchParams.get("skip") ?? "0");
  if (!Number.isInteger(skip) || skip < 0) {
    return NextResponse.json({ error: "Invalid skip." }, { status: 422 });
  }

  const { posts, hasMore } = await getFeedPosts(user, { skip });
  return NextResponse.json({ posts, hasMore });
}
