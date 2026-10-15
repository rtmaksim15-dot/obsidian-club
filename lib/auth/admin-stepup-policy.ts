// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md).
// Pure — no DOM, no cookies, no crypto, no DB. This is the actual
// policy decision ("is this admin's step-up still fresh enough?"),
// kept separate from the cookie sign/verify mechanics (admin-stepup.ts)
// and from middleware.ts's own request/response plumbing, so the rule
// itself is unit-testable without a browser or an edge runtime (see
// vitest.config.ts — this project's test runner is Node-only, no DOM).
//
// Two independent clocks, both must be satisfied:
// - step-up (12h, absolute): time since the admin last actually
//   completed a fresh TOTP verification. Resets only on a real
//   mfa.challengeAndVerify() success.
// - idle (30m, rolling): time since the admin's last request to any
//   /admin or /api/admin path. Refreshed by every such request while
//   still valid — so a continuously active admin can stay in for up to
//   12h without re-entering a code, but a 30+ minute gap forces it
//   regardless of how much of the 12h ceiling is left.
export const STEP_UP_WINDOW_MS = 12 * 60 * 60 * 1000;
export const IDLE_WINDOW_MS = 30 * 60 * 1000;

export type StepUpState = { mfaVerifiedAtMs: number; lastActivityMs: number };

export type StepUpDecision =
  | { action: "allow"; refreshedState: StepUpState }
  | { action: "require-stepup"; reason: "missing" | "stepup-expired" | "idle-expired" };

/**
 * `state` is whatever the caller could verify from the signed cookie —
 * null if it was missing, malformed, or failed signature verification
 * (admin-stepup.ts#verifyStepUpCookie already collapses all of those to
 * null; this function never needs to know which).
 */
export function decideStepUp(
  state: StepUpState | null,
  nowMs: number,
  windows: { stepUpWindowMs: number; idleWindowMs: number } = {
    stepUpWindowMs: STEP_UP_WINDOW_MS,
    idleWindowMs: IDLE_WINDOW_MS,
  },
): StepUpDecision {
  if (!state) return { action: "require-stepup", reason: "missing" };
  if (nowMs - state.mfaVerifiedAtMs > windows.stepUpWindowMs) {
    return { action: "require-stepup", reason: "stepup-expired" };
  }
  if (nowMs - state.lastActivityMs > windows.idleWindowMs) {
    return { action: "require-stepup", reason: "idle-expired" };
  }
  return { action: "allow", refreshedState: { mfaVerifiedAtMs: state.mfaVerifiedAtMs, lastActivityMs: nowMs } };
}
