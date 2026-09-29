import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { grantAchievement } from "@/lib/utils/achievements";
import { checkRateLimit } from "@/lib/security/rate-limit";

type Body = { rating?: number; comment?: string; context?: string };

// Fix 10 (2026-09-29, see DECISIONS.md, supersedes this file's old
// "reviewing the same member more than once is allowed" note): explicit
// instruction — one review per (reviewer, reviewed) pair, ever. Enforced
// atomically below via the same pg_advisory_xact_lock pattern
// lib/security/rate-limit.ts uses, not a plain findFirst-then-create
// (which would have exactly the race that fix was written to close) —
// no schema change/unique constraint added without a separate migration
// approval. 20/hour on top of that: the dedup already caps total spam
// against one target, this bounds spreading many one-off reviews across
// many different members in a burst.
const REVIEW_LIMIT = { max: 20, windowMs: 60 * 60 * 1000 };
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const reviewer = await getCurrentUser();
  if (!reviewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  if (reviewer.id === params.id) {
    return NextResponse.json({ error: "You can't review yourself." }, { status: 422 });
  }

  const reviewed = await prisma.user.findUnique({ where: { id: params.id } });
  if (!reviewed) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const rateLimit = await checkRateLimit(`review:${reviewer.id}`, REVIEW_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reviews. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const rating = body.rating;
  if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) {
    return NextResponse.json({ error: "Rating must be an integer 1-5." }, { status: 422 });
  }

  // Dedup key intentionally unordered-pair-safe: reviewerId/reviewedId
  // are never swapped between the two people, so a plain concatenation
  // is fine — this isn't a symmetric relationship like a block.
  const dedupKey = `review-pair:${reviewer.id}:${reviewed.id}`;
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dedupKey}))`;
    const existing = await tx.review.findFirst({
      where: { reviewerId: reviewer.id, reviewedId: reviewed.id },
      select: { id: true },
    });
    if (existing) return null;
    return tx.review.create({
      data: {
        reviewerId: reviewer.id,
        reviewedId: reviewed.id,
        rating: rating!,
        comment: body.comment?.trim() || null,
        context: body.context?.trim() || null,
      },
    });
  });
  if (!created) {
    return NextResponse.json({ error: "You've already reviewed this member." }, { status: 409 });
  }

  // Reputation = average of visible reviews received (PRODUCT.md doesn't
  // specify an exact formula beyond "звёзды 1-5, зависит от поведения..." —
  // a straight average of received reviews is this session's documented,
  // reasonable default).
  const visibleReviews = await prisma.review.findMany({
    where: { reviewedId: reviewed.id, isVisible: true },
    select: { rating: true },
  });
  const avgReputation =
    visibleReviews.reduce((sum, r) => sum + r.rating, 0) / visibleReviews.length;

  await prisma.user.update({
    where: { id: reviewed.id },
    data: { reputation: avgReputation },
  });

  if (visibleReviews.length === 1) {
    await grantAchievement(reviewed.id, "first-reputation-star");
  }

  // Note: receiving a review no longer moves REP directly — CLAUDE.md's
  // (2026-07-05) REP table doesn't list "received a review" as an
  // earn/lose action. `reputation` (the star average, above) and REP are
  // independent scores as of ADR-0015.

  return NextResponse.json({ ok: true }, { status: 201 });
}
