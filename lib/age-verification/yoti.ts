import "server-only";
import crypto from "crypto";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";
import type { AgeVerificationProvider, SessionResult, AgeVerificationResultStatus } from "./types";

// Yoti Age Verification (hosted session product — age.yoti.com/api/v1,
// Bearer-token auth), confirmed against live documentation on
// 2026-10-10 per the task's own A1 instruction, NOT from training-data
// memory. This is a different product from the legacy `yoti` npm
// package (PEM-key auth, idverify/age-estimation-verify) — deliberately
// not used here.
//
// ====================== CONFIRMED FROM DOCS ======================
// POST https://age.yoti.com/api/v1/sessions
//   headers: Authorization: Bearer <YOTI_API_KEY>, Yoti-SDK-Id: <YOTI_SDK_ID>
//   body fields used below are all documented at
//   developers.yoti.com/age-verification/create-a-session
//   response is ONLY { id, expires_at, status } — no redirect
//   URL/token/QR field. Double-checked with a second fetch specifically
//   for this, since a missing field here would have been easy to miss.
// GET https://age.yoti.com/api/v1/sessions/<id>/result
//   real status enum: PENDING, IN_PROGRESS, FAIL, COMPLETE, ERROR,
//   CANCELLED, EXPIRED — NOT pending/passed/failed/expired/cancelled.
//   Translated below in mapYotiStatus(). Response also carries
//   `method`, `age`, and per-method `threshold`/`allowed`/`attempts`.
// Hosted portal URL: https://age.yoti.com?sessionId=<id>&sdkId=<sdkId>
//   (developers.yoti.com/age-verification/quick-start /
//   launch-the-user-view) — can be opened directly or embedded.
// ===================================================================
//
// ========================= OPEN GAPS ==============================
// (a) webhook (`notification_url`) payload field names, and
// (b) webhook signature-verification mechanics (header name,
//     algorithm, secret source) are NOT in what's publicly fetchable
//     from this session — no live Yoti Hub/sandbox account was
//     available to confirm them. verifyWebhook() below fails CLOSED
//     (rejects) until a real Yoti Hub account confirms these — see the
//     Phase A report. DO NOT loosen this without that confirmation.
// (c) the exact JSON key to request/confirm liveness during session
//     creation wasn't found in the fields this session could fetch
//     (only age_estimation/doc_scan/digital_id/credit_card/mobile were
//     confirmed) — omitted from the request body below rather than
//     guessed. Facial age estimation may include liveness by default
//     on Yoti's side; confirm against a live sandbox before relying on
//     this for "liveness on" (A4).
// (d) the exact shape of a COMPLETE result (how "passed vs failed"
//     surfaces — a single top-level field, or only inferred from each
//     method's own `allowed`) isn't confirmed either. mapYotiStatus()
//     below takes the conservative reading: COMPLETE is only "passed"
//     if an explicit `allowed`/`result` signal says so; anything
//     ambiguous maps to "failed", never to "passed" by default.
// ===================================================================

const YOTI_BASE_URL = "https://age.yoti.com/api/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[age-verification/yoti] Missing required env var ${name}`);
  return value;
}

function appUrl(): string {
  return requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
}

function ageEstimationThreshold(): number {
  const raw = process.env.AGE_ESTIMATION_THRESHOLD;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

// Raw shape of what we send Yoti — intentionally not the full set of
// fields Yoti's docs mention (synchronous_checks, template_id, etc.);
// only what A4/A7's decisions actually call for.
function buildSessionBody() {
  return {
    type: "OVER",
    age_estimation: {
      allowed: true,
      threshold: ageEstimationThreshold(),
      retry_limit: 3,
    },
    doc_scan: {
      allowed: true,
      threshold: MIN_MEMBER_AGE,
      retry_limit: 3,
    },
    digital_id: {
      allowed: true,
      threshold: MIN_MEMBER_AGE,
      age_estimation_allowed: false,
    },
    ttl: 3600,
    callback: { url: `${appUrl()}/verify/return`, auto: true },
    notification_url: `${appUrl()}/api/age-verification/webhook`,
    cancel_url: `${appUrl()}/verify`,
    retry_enabled: true,
  };
}

type YotiStatus = "PENDING" | "IN_PROGRESS" | "FAIL" | "COMPLETE" | "ERROR" | "CANCELLED" | "EXPIRED";

interface YotiResultResponse {
  status: YotiStatus;
  method?: string;
  age?: number;
  // Per-method detail blocks aren't typed field-by-field here — only
  // read defensively below, since their exact shape isn't confirmed
  // (see gap (d) above).
  [key: string]: unknown;
}

function methodAllowed(result: YotiResultResponse, method: string): boolean | undefined {
  const block = result[method];
  if (block && typeof block === "object" && "allowed" in block) {
    const allowed = (block as { allowed?: unknown }).allowed;
    return typeof allowed === "boolean" ? allowed : undefined;
  }
  return undefined;
}

function mapYotiMethod(method: string | undefined): SessionResult["method"] {
  if (method === "age_estimation" || method === "doc_scan" || method === "digital_id") return method;
  return undefined;
}

// Deliberately conservative (see gap (d)): COMPLETE only becomes
// "passed" when at least one method explicitly says `allowed: true`;
// everything else — including an ambiguous COMPLETE with no readable
// signal — fails closed to "failed" rather than risking a false pass.
function mapYotiStatus(result: YotiResultResponse): AgeVerificationResultStatus {
  switch (result.status) {
    case "PENDING":
    case "IN_PROGRESS":
      return "pending";
    case "CANCELLED":
      return "cancelled";
    case "EXPIRED":
      return "expired";
    case "FAIL":
    case "ERROR":
      return "failed";
    case "COMPLETE": {
      const anyAllowed =
        methodAllowed(result, "age_estimation") === true ||
        methodAllowed(result, "doc_scan") === true ||
        methodAllowed(result, "digital_id") === true;
      return anyAllowed ? "passed" : "failed";
    }
    default:
      return "failed";
  }
}

export const yotiProvider: AgeVerificationProvider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-required param; Yoti's session isn't scoped by our userId at creation (reference_id isn't set — see createSession body)
  async createSession(_userId: string) {
    const res = await fetch(`${YOTI_BASE_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireEnv("YOTI_API_KEY")}`,
        "Yoti-SDK-Id": requireEnv("YOTI_SDK_ID"),
      },
      body: JSON.stringify(buildSessionBody()),
    });
    if (!res.ok) {
      throw new Error(`[age-verification/yoti] createSession failed: ${res.status}`);
    }
    const body = (await res.json()) as { id: string };
    const redirectUrl = `https://age.yoti.com?sessionId=${encodeURIComponent(body.id)}&sdkId=${encodeURIComponent(
      requireEnv("YOTI_SDK_ID"),
    )}`;
    return { sessionId: body.id, redirectUrl };
  },

  async getResult(sessionId: string): Promise<SessionResult> {
    const res = await fetch(`${YOTI_BASE_URL}/sessions/${encodeURIComponent(sessionId)}/result`, {
      headers: {
        Authorization: `Bearer ${requireEnv("YOTI_API_KEY")}`,
        "Yoti-SDK-Id": requireEnv("YOTI_SDK_ID"),
      },
    });
    if (!res.ok) {
      throw new Error(`[age-verification/yoti] getResult failed: ${res.status}`);
    }
    const body = (await res.json()) as YotiResultResponse;
    return { status: mapYotiStatus(body), method: mapYotiMethod(body.method) };
  },

  // Gap (b) above: Yoti's real webhook signature mechanism isn't
  // confirmed. Fails CLOSED — rejects every request — unless
  // YOTI_WEBHOOK_SECRET is set AND the request carries a matching
  // shared secret. This is a deliberately conservative placeholder,
  // not a confirmed implementation of Yoti's real scheme; do not rely
  // on it in production until that's verified against a live account.
  async verifyWebhook(request: Request) {
    const expected = process.env.YOTI_WEBHOOK_SECRET;
    if (!expected) return false;
    const provided = request.headers.get("x-yoti-webhook-secret");
    if (!provided) return false;
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(provided);
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  },
};
