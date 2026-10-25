import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/require-admin";
import { PUSH_ENABLED } from "@/lib/config/feature-flags";
import { sendLordWordBroadcast } from "@/lib/push/send";

const MAX_LENGTH = 140;

type Body = { text?: string };

// POST /api/admin/push/lord-word — Web Push, Package N1 (2026-10-25,
// see DECISIONS.md), item 6's admin broadcast. `text` itself is never
// actually sent in the push payload — every recipient gets the same
// fixed discreet/non-discreet "The Lord has spoken" copy
// (lib/push/payload.ts), same as every other category; this route
// only validates the length ceiling the task's own spec sets (≤140
// chars) as a guardrail on what an admin is allowed to broadcast
// *about* in spirit, even though the wire payload doesn't carry it.
// No separate "text" storage exists — nothing here persists what was
// typed, by design (this is a push trigger, not a content model).
export async function POST(request: Request) {
  if (!PUSH_ENABLED) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 422 });
  }
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_LENGTH} characters or fewer.` }, { status: 422 });
  }

  const result = await sendLordWordBroadcast(adminResult.user.id);
  if (!result.ok) {
    if (result.reason === "throttled") {
      return NextResponse.json({ error: "The Lord has already spoken in the last 24 hours." }, { status: 429 });
    }
    return NextResponse.json({ error: "Push notifications are not enabled." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, recipientCount: result.recipientCount });
}
