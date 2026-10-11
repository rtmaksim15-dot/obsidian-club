import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { AGE_VERIFICATION_ENABLED } from "@/lib/age-verification/gate";
import { startVerification } from "@/lib/age-verification";
import { errCode } from "@/lib/utils/safe-error";

// POST /api/age-verification/start (A5) — creates a new provider
// session and a new `pending` AgeVerification row, and hands back the
// hosted-flow redirectUrl for the client to navigate to. A generous
// anti-abuse ceiling, separate from the real business control: A8's
// 3-failed-attempts lockout (startVerification() itself enforces that
// and returns `{ locked: true }` instead of creating a session).
const START_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function POST() {
  if (!AGE_VERIFICATION_ENABLED) {
    return NextResponse.json({ error: "Age verification is not enabled." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (user.ageVerified) {
    return NextResponse.json({ error: "Already verified." }, { status: 422 });
  }

  const rateLimit = await checkRateLimit(`age-verification:start:${user.id}`, START_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const result = await startVerification(user.id);
    if (result.locked) {
      return NextResponse.json({ locked: true }, { status: 200 });
    }
    return NextResponse.json({ locked: false, redirectUrl: result.redirectUrl }, { status: 200 });
  } catch (err) {
    console.error("[age-verification/start] Failed to start session:", errCode(err));
    return NextResponse.json({ error: "Could not start verification." }, { status: 502 });
  }
}
