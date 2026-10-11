import { NextResponse } from "next/server";
import { mockProvider } from "@/lib/age-verification/mock";
import { yotiProvider } from "@/lib/age-verification/yoti";
import { recordVerificationResult } from "@/lib/age-verification";
import { errCode } from "@/lib/utils/safe-error";

// POST /api/age-verification/webhook (A5) — Yoti's `notification_url`.
// Signature verification is delegated to the active provider's
// verifyWebhook(); see lib/age-verification/yoti.ts's header comment
// for the two confirmed-undocumented gaps (payload field names, real
// signature mechanism) this fails CLOSED against. The mock provider's
// verifyWebhook() always returns false — it has no real webhook to
// receive.
//
// Session-id field name is a third unconfirmed gap (same header
// comment) — accepts either `id` or `session_id` defensively rather
// than assuming one.
export async function POST(request: Request) {
  const providerName = process.env.AGE_VERIFICATION_PROVIDER === "yoti" ? "yoti" : "mock";
  const provider = providerName === "yoti" ? yotiProvider : mockProvider;

  const verified = await provider.verifyWebhook(request.clone());
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let body: { id?: string; session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sessionId = body.session_id ?? body.id;
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id." }, { status: 400 });
  }

  try {
    // Idempotent by design (recordVerificationResult no-ops on an
    // already-resolved row) — a duplicate webhook delivery is safe.
    await recordVerificationResult(sessionId);
  } catch (err) {
    console.error("[age-verification/webhook] Failed to record result:", errCode(err));
    return NextResponse.json({ error: "Could not process webhook." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
