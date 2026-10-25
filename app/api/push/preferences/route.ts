import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PUSH_ENABLED } from "@/lib/config/feature-flags";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/push/preferences";

type Body = Partial<NotificationPreferences>;

const BOOLEAN_KEYS: (keyof NotificationPreferences)[] = ["discreet", "messages", "replies", "lordWord"];

// GET/PATCH /api/push/preferences — the caller's own notification
// preferences (discreet mode + the three category toggles), read by
// NotificationSettingsForm.tsx on load and patched on every toggle.
export async function GET() {
  if (!PUSH_ENABLED) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const preferences = await getNotificationPreferences(user.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
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

  const patch: Body = {};
  for (const key of BOOLEAN_KEYS) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") {
        return NextResponse.json({ error: `${key} must be a boolean.` }, { status: 422 });
      }
      patch[key] = body[key];
    }
  }

  const preferences = await setNotificationPreferences(user.id, patch);
  return NextResponse.json({ preferences });
}
