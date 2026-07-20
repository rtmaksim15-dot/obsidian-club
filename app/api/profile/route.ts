import { NextResponse } from "next/server";
import type { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkProfileCompleteBonus } from "@/lib/rating/rep-engine";

const VALID_ROLES: MemberRole[] = ["dominant", "submissive", "switch", "observer", "newcomer"];
const MAX_INTERESTS = 10;

type Body = {
  displayName?: string;
  username?: string;
  bio?: string;
  locationCity?: string;
  role?: string;
  interests?: string[];
};

// PATCH /api/profile — edits the CALLER's own profile. The user id always
// comes from the session, never from the request body, so there's no way
// to edit someone else's profile by passing a different id.
export async function PATCH(request: Request) {
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

  const displayName = body.displayName?.trim();
  const username = body.username?.trim();
  const bio = body.bio?.trim();
  const locationCity = body.locationCity?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required." }, { status: 422 });
  }
  if (!username || !/^[a-z0-9-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-30 characters: lowercase letters, numbers, hyphens." },
      { status: 422 }
    );
  }
  if (bio && bio.length > 300) {
    return NextResponse.json({ error: "Bio must be 300 characters or fewer." }, { status: 422 });
  }

  let role: MemberRole | undefined;
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role as MemberRole)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 422 });
    }
    role = body.role as MemberRole;
  }

  let interests: string[] | undefined;
  if (body.interests !== undefined) {
    if (!Array.isArray(body.interests) || body.interests.some((i) => typeof i !== "string")) {
      return NextResponse.json({ error: "Invalid interests." }, { status: 422 });
    }
    interests = body.interests
      .map((i) => i.trim())
      .filter(Boolean)
      .slice(0, MAX_INTERESTS);
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        username,
        bio: bio || null,
        ...(locationCity !== undefined ? { locationCity: locationCity || null } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(interests !== undefined ? { interests } : {}),
      },
    });

    // Non-critical side effect — never fail the save over it.
    await checkProfileCompleteBonus(user.id).catch((err) =>
      console.error("[profile] Failed to check profile-complete REP bonus:", err),
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const isUniqueViolation =
      typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
    if (isUniqueViolation) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    console.error("[profile] Failed to update:", err);
    return NextResponse.json({ error: "Could not save changes. Try again shortly." }, { status: 503 });
  }
}
