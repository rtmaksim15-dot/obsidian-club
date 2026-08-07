import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

// Must stay identical to app/api/profile/route.ts's USERNAME_PATTERN —
// not imported from there since that file has no other exports worth
// sharing yet; duplicated once, not worth a shared module for one regex.
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// GET /api/profile/username-check?username=xxx — live availability
// check for ProfileEditForm.tsx's username field (Username-in-the-
// Ritual, 2026-08-06). Read-only; the actual save (and its
// one-lifetime-change enforcement) still happens in PATCH /api/profile
// — this only tells the UI whether a value is *currently* takeable, not
// whether the caller is allowed to take it.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase() ?? "";

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json({ available: false, reason: "invalid" });
  }

  // Keeping your own current username is always "available" — this is
  // a live-typing check, not a same-value-rejected constraint.
  if (username === user.username) {
    return NextResponse.json({ available: true });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  return NextResponse.json({ available: !existing, reason: existing ? "taken" : undefined });
}
