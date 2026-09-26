import { NextResponse } from "next/server";
import type { MemberRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkProfileCompleteBonus } from "@/lib/rating/rep-engine";

const VALID_ROLES: MemberRole[] = ["dominant", "submissive", "switch", "observer", "newcomer"];
const MAX_INTERESTS = 10;
// Username-in-the-Ritual (2026-08-06): 3-20 chars, lowercase letters/
// digits/underscore. Tightened from the old 3-30-with-hyphens rule.
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

  // Onboarding fix (2026-09-25, see DECISIONS.md): fetched up front now,
  // not only inside the old `if (usernameIsChanging)` block, because
  // whether this member has ever made their ritual pick — not whether
  // the submitted string happens to differ from the stored one — is what
  // decides both the format check and the one-lifetime-change gate
  // below. This mattered most when new members still got an
  // auto-generated placeholder username at signup (removed the same
  // day, see the username-removal note below): accepting that
  // pre-filled suggestion exactly as shown was a legitimate choice, but
  // submitted the *same* string back, so `usernameIsChanging` was false
  // and `usernameChosen` never got set — the ritual step stayed stuck no
  // matter how many other fields they filled in, until they typed
  // something literally different. Now that new members start with no
  // username at all, this exact path can't recur for them (any
  // non-empty submission is definitionally a change), but the guard
  // stays for existing/grandfathered members who haven't made their
  // ritual pick yet under the old rules.
  //
  // Username removal (2026-09-25, see DECISIONS.md): registration no
  // longer auto-generates a placeholder at all — deriving one from the
  // email leaked both the email and often the member's real name,
  // unacceptable for a closed 18+ club (see app/api/join/[token]/
  // route.ts). `username` is now `String?`; a brand-new member's
  // `user.username` here is `null` until their first real save.
  const existingProfile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  const progress = (existingProfile?.ritualProgress ?? {}) as Prisma.InputJsonObject;
  const usernameAlreadyChosen = progress.usernameChosen === true;
  // Guarded by usernameAlreadyChosen, not usernameChangedAt, so this
  // never fires again for a member whose ritual pick already happened
  // (including grandfathered members backfilled with usernameChosen
  // true — see prisma/schema.prisma's usernameChangedAt comment) —
  // their ordinary bio-only edit, which also resubmits their current
  // username unchanged, must never re-trigger this or spend a change
  // they haven't used yet.
  const isRitualPick = !usernameAlreadyChosen;

  // Format is enforced whenever the value is actually changing, OR this
  // is the member's still-outstanding ritual pick (even resubmitted
  // unchanged) — a grandfathered username from before this rule
  // tightened (e.g. one with a hyphen, allowed under the old 3-30 rule)
  // must stay saveable as-is on every other field once its one-time
  // ritual credit is already behind it.
  if ((usernameIsChanging || isRitualPick) && !USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: lowercase letters, numbers, underscores." },
      { status: 422 }
    );
  }
  // Username-in-the-Ritual (2026-08-06): one lifetime change. A brand
  // new member's ritual-time pick IS that one change — there's no
  // separate "free first pick" — so this only ever blocks a *further*
  // change attempted after the ritual pick is already made; the pick
  // itself is never blocked here.
  if (usernameIsChanging && !isRitualPick && user.usernameChangedAt) {
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
        ...(usernameIsChanging || isRitualPick ? { usernameChangedAt: new Date() } : {}),
      },
    });

    // Marks the ritual's profile step's username requirement satisfied
    // (lib/auth/ritual.ts) — on the ritual pick (see isRitualPick above),
    // not only on an actual text change; re-saving the same username
    // once that pick is already behind them (e.g. just editing bio)
    // still doesn't need this read-modify-write. Reuses `progress`
    // fetched up front, not a fresh read — nothing else writes
    // ritualProgress between that read and here, and re-fetching would
    // just be a redundant round-trip to the same row.
    if (isRitualPick) {
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
