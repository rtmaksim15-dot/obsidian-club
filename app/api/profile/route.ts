import { NextResponse } from "next/server";
import type { MemberRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkProfileCompleteBonus } from "@/lib/rating/rep-engine";

const VALID_ROLES: MemberRole[] = ["dominant", "submissive", "switch", "observer", "newcomer"];
const MAX_INTERESTS = 10;
// Username-in-the-Ritual (2026-08-06): 3-20 chars, lowercase letters/
// digits/underscore. Tightened from the old 3-30-with-hyphens rule —
// see lib/utils/codes.ts's generateUsernameFromEmail for the matching
// placeholder-format update.
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

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
  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 422 });
  }
  const usernameIsChanging = username !== user.username;
  // Format is only enforced when the value is actually changing — a
  // grandfathered username from before this rule tightened (e.g. one
  // with a hyphen, allowed under the old 3-30 rule) must stay saveable
  // as-is on every other field, or a member editing just their bio
  // would get rejected over a username they never touched.
  if (usernameIsChanging && !USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: lowercase letters, numbers, underscores." },
      { status: 422 }
    );
  }
  // Username-in-the-Ritual (2026-08-06): one lifetime change. A brand
  // new member's ritual-time pick (replacing their auto-generated
  // placeholder) IS that one change — there's no separate "free first
  // pick," which is exactly what lets an existing member's grandfathered
  // one-time courtesy change reuse this same check with no
  // special-casing (see lib/auth/ritual.ts and prisma/schema.prisma's
  // usernameChangedAt comment).
  if (usernameIsChanging && user.usernameChangedAt) {
    return NextResponse.json(
      { error: "You've already used your one username change." },
      { status: 422 },
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
        ...(usernameIsChanging ? { usernameChangedAt: new Date() } : {}),
      },
    });

    // Marks the ritual's profile step's username requirement satisfied
    // (lib/auth/ritual.ts) — only on an actual change, matching
    // usernameChangedAt above; re-saving the same username (e.g. just
    // editing bio) doesn't need this read-modify-write.
    if (usernameIsChanging) {
      const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
      const progress = (profile?.ritualProgress ?? {}) as Prisma.InputJsonObject;
      await prisma.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ritualProgress: { usernameChosen: true } },
        update: { ritualProgress: { ...progress, usernameChosen: true } },
      });
    }

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
