// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md).
// The signed cookie that carries the step-up/idle state (admin-stepup-
// policy.ts has the actual rule). Deliberately a SEPARATE cookie from
// Supabase's own session cookie (lib/auth/cookie-options.ts) rather than
// piggybacking on it — this one is HttpOnly (no browser-client code
// ever needs to read it, unlike the Supabase cookie's documented
// httpOnly:false tradeoff) and SameSite=Strict (admin-only, no OAuth
// cross-site redirect ever needs to carry it).
//
// Uses Web Crypto (`crypto.subtle`) rather than Node's `crypto` module
// so the exact same code runs in both the Node runtime (API routes,
// requireAdmin()) and the Edge runtime (middleware.ts) — Node 19+
// exposes the same global, and Next.js's Edge runtime provides it too.
//
// Signed, not encrypted: the timestamps inside aren't secret (the admin
// themselves already knows when they last verified), the signature just
// stops a client from forging "I verified 1 second ago" by hand-editing
// the cookie. ADMIN_SESSION_SECRET is a new, dedicated secret for this
// one purpose — deliberately not reusing SUPABASE_SERVICE_ROLE_KEY or
// any other existing secret for an unrelated signing job.
import type { StepUpState } from "./admin-stepup-policy";
import { STEP_UP_WINDOW_MS } from "./admin-stepup-policy";

export const ADMIN_STEPUP_COOKIE_NAME = "oc_admin_su";

/**
 * Shared between every place that writes this cookie (middleware.ts's
 * idle-refresh, the MFA-verify route's fresh-step-up write) so they can
 * never drift apart. `maxAge` is a little past the logical 12h ceiling
 * (admin-stepup-policy.ts enforces the real one from the cookie's own
 * signed content) — the browser-level expiry here is just housekeeping,
 * not the actual security boundary.
 */
export const ADMIN_STEPUP_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: Math.ceil(STEP_UP_WINDOW_MS / 1000) + 60 * 60, // 12h + 1h buffer, in seconds
};

/**
 * Admin security hardening, Package S1 follow-up (2026-10-15, see
 * DECISIONS.md) — a silent check (no console.error, unlike getSecret()
 * below) for the admin console's own "step-up protection inactive"
 * banner. Server-only; the page reads this and passes a plain boolean
 * down as a prop — never the secret's value itself.
 */
export function isStepUpSecretConfigured(): boolean {
  return Boolean(process.env.ADMIN_SESSION_SECRET);
}

function getSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error(
      "[admin-stepup] ADMIN_SESSION_SECRET is unset — every admin step-up check fails closed " +
        "(treated as if no step-up cookie were present) until it's set.",
    );
    return null;
  }
  return secret;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** `mfaVerifiedAtMs.lastActivityMs.hexHmac` — fails closed (returns null) if the secret is unset. */
export async function signStepUpCookie(state: StepUpState): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;

  const payload = `${state.mfaVerifiedAtMs}.${state.lastActivityMs}`;
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toHex(signature)}`;
}

/** Verifies the signature and parses the two timestamps; null on anything wrong (missing secret, malformed value, bad signature, non-numeric timestamps). */
export async function verifyStepUpCookie(value: string | undefined | null): Promise<StepUpState | null> {
  if (!value) return null;
  const secret = getSecret();
  if (!secret) return null;

  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [mfaVerifiedAtStr, lastActivityStr, signatureHex] = parts;

  const mfaVerifiedAtMs = Number(mfaVerifiedAtStr);
  const lastActivityMs = Number(lastActivityStr);
  if (!Number.isFinite(mfaVerifiedAtMs) || !Number.isFinite(lastActivityMs)) return null;
  if (!/^[0-9a-f]+$/i.test(signatureHex)) return null;

  const payload = `${mfaVerifiedAtStr}.${lastActivityStr}`;
  const key = await hmacKey(secret);
  const signatureBytes = new Uint8Array(signatureHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(payload));
  if (!valid) return null;

  return { mfaVerifiedAtMs, lastActivityMs };
}
