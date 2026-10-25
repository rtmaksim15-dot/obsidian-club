import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { PUSH_ENABLED } from "@/lib/config/feature-flags";
import { parseUserAgent } from "@/lib/security/user-agent";

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

// POST /api/push/subscribe — Web Push, Package N1 (2026-10-25, see
// DECISIONS.md). Called only from the "Enable on this device" button
// (components/shared/NotificationSettingsForm.tsx) after the browser's
// own permission prompt and pushManager.subscribe() already succeeded
// — this route just persists the resulting PushSubscription object.
// `onConflict: endpoint` (upsert, not create) — re-tapping "Enable" on
// a device that's already subscribed (e.g. after reinstalling) reuses
// the same endpoint the browser hands back rather than erroring on the
// unique constraint.
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

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 422 });
  }

  const { browser, os } = parseUserAgent(request.headers.get("user-agent"));

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgentShort: `${browser} on ${os}`,
    },
    update: {
      userId: user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgentShort: `${browser} on ${os}`,
      lastUsedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
