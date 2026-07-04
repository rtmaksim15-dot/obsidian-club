import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { recalculateRating } from "@/lib/rating/rating-engine";
import { grantAchievement } from "@/lib/utils/achievements";

type Body = { rating?: number; comment?: string; context?: string };

// POST /api/users/:id/review — per ARCHITECTURE.md §4. No documented
// restriction on reviewing the same member more than once (e.g. after
// each event, once Events exist) — allowed here; the only hard rule is
// no self-review.
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

  await prisma.review.create({
    data: {
      reviewerId: reviewer.id,
      reviewedId: reviewed.id,
      rating: rating!,
      comment: body.comment?.trim() || null,
      context: body.context?.trim() || null,
    },
  });

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

  await recalculateRating(reviewed.id, "Received a new review", "review");

  return NextResponse.json({ ok: true }, { status: 201 });
}
