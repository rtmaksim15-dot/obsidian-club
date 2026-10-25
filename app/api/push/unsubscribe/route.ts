import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { PUSH_ENABLED } from "@/lib/config/feature-flags";

type Body = { endpoint?: string };

// POST /api/push/unsubscribe — "Turn off on this device." Deletes only
// the one PushSubscription row matching this browser's own endpoint
// (never the account's other devices) — scoped to the caller's own
// userId too, so one member can never remove another's subscription by
// guessing/replaying an endpoint value.
export async function POST(request: Request) {
  if (!PUSH_ENABLED) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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
  if (!body.endpoint) {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 422 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: user.id } });

  return NextResponse.json({ ok: true });
}
