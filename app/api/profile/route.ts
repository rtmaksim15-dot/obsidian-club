import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";

type Body = { displayName?: string; username?: string; bio?: string };

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

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required." }, { status: 422 });
  }
  if (!username || !/^[a-z0-9-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-30 characters: lowercase letters, numbers, hyphens." },
      { status: 422 }
    );
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { displayName, username, bio: bio || null },
    });
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
