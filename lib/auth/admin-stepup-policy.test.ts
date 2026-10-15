import { describe, expect, it } from "vitest";
import { decideStepUp, STEP_UP_WINDOW_MS, IDLE_WINDOW_MS } from "./admin-stepup-policy";

const NOW = 1_000_000_000_000; // arbitrary fixed instant

describe("decideStepUp", () => {
  it("no state at all: requires step-up (reason: missing)", () => {
    expect(decideStepUp(null, NOW)).toEqual({ action: "require-stepup", reason: "missing" });
  });

  it("fresh on both clocks: allowed, idle clock refreshed to now, step-up clock untouched", () => {
    const state = { mfaVerifiedAtMs: NOW - 1000, lastActivityMs: NOW - 1000 };
    expect(decideStepUp(state, NOW)).toEqual({
      action: "allow",
      refreshedState: { mfaVerifiedAtMs: NOW - 1000, lastActivityMs: NOW },
    });
  });

  it("just under both windows: allowed", () => {
    const state = { mfaVerifiedAtMs: NOW - (STEP_UP_WINDOW_MS - 1), lastActivityMs: NOW - (IDLE_WINDOW_MS - 1) };
    expect(decideStepUp(state, NOW).action).toBe("allow");
  });

  it("step-up older than 12h (even if idle clock is fresh): requires step-up (stepup-expired)", () => {
    const state = { mfaVerifiedAtMs: NOW - (STEP_UP_WINDOW_MS + 1), lastActivityMs: NOW - 10 };
    expect(decideStepUp(state, NOW)).toEqual({ action: "require-stepup", reason: "stepup-expired" });
  });

  it("idle for more than 30m (even well inside the 12h ceiling): requires step-up (idle-expired)", () => {
    const state = { mfaVerifiedAtMs: NOW - 60_000, lastActivityMs: NOW - (IDLE_WINDOW_MS + 1) };
    expect(decideStepUp(state, NOW)).toEqual({ action: "require-stepup", reason: "idle-expired" });
  });

  it("step-up check takes priority when both clocks are simultaneously expired", () => {
    const state = { mfaVerifiedAtMs: NOW - (STEP_UP_WINDOW_MS + 1), lastActivityMs: NOW - (IDLE_WINDOW_MS + 1) };
    expect(decideStepUp(state, NOW)).toEqual({ action: "require-stepup", reason: "stepup-expired" });
  });

  it("exactly at the window boundary does not trigger (strictly greater-than)", () => {
    const state = { mfaVerifiedAtMs: NOW - STEP_UP_WINDOW_MS, lastActivityMs: NOW - IDLE_WINDOW_MS };
    expect(decideStepUp(state, NOW).action).toBe("allow");
  });

  it("a continuously active admin can outlast the idle window repeatedly without a fresh code, up to the 12h ceiling", () => {
    // Simulates refresh calls every 10 minutes for just under 12h.
    let state = { mfaVerifiedAtMs: NOW, lastActivityMs: NOW };
    for (let elapsed = 10 * 60 * 1000; elapsed < STEP_UP_WINDOW_MS; elapsed += 10 * 60 * 1000) {
      const decision = decideStepUp(state, NOW + elapsed);
      expect(decision.action).toBe("allow");
      if (decision.action === "allow") state = decision.refreshedState;
    }
  });

  it("custom windows are respected instead of the exported defaults", () => {
    const state = { mfaVerifiedAtMs: NOW - 5000, lastActivityMs: NOW - 5000 };
    expect(decideStepUp(state, NOW, { stepUpWindowMs: 4000, idleWindowMs: 60_000 })).toEqual({
      action: "require-stepup",
      reason: "stepup-expired",
    });
  });
});
