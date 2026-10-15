import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signStepUpCookie, verifyStepUpCookie, isStepUpSecretConfigured } from "./admin-stepup";

const ORIGINAL_SECRET = process.env.ADMIN_SESSION_SECRET;

// Admin console safety banner (Package S1 follow-up, 2026-10-15, see
// DECISIONS.md) — "Step-up protection inactive" shows exactly when
// this is false. Separate describe block (not nested under the
// beforeEach below, which always sets a secret) so each case controls
// the env var explicitly.
describe("isStepUpSecretConfigured", () => {
  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = ORIGINAL_SECRET;
  });

  it("true when ADMIN_SESSION_SECRET is set", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-do-not-use-in-prod";
    expect(isStepUpSecretConfigured()).toBe(true);
  });

  it("false when unset", () => {
    delete process.env.ADMIN_SESSION_SECRET;
    expect(isStepUpSecretConfigured()).toBe(false);
  });

  it("false when set to an empty string", () => {
    process.env.ADMIN_SESSION_SECRET = "";
    expect(isStepUpSecretConfigured()).toBe(false);
  });
});

describe("admin step-up cookie sign/verify", () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "test-secret-do-not-use-in-prod";
  });
  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = ORIGINAL_SECRET;
  });

  it("round-trips: what's signed is exactly what verify returns", async () => {
    const state = { mfaVerifiedAtMs: 1_700_000_000_000, lastActivityMs: 1_700_000_100_000 };
    const cookie = await signStepUpCookie(state);
    expect(cookie).not.toBeNull();
    const verified = await verifyStepUpCookie(cookie);
    expect(verified).toEqual(state);
  });

  it("rejects a tampered timestamp (signature no longer matches)", async () => {
    const cookie = await signStepUpCookie({ mfaVerifiedAtMs: 1000, lastActivityMs: 2000 });
    const tampered = cookie!.replace("1000", "9999999999999"); // forge a far-future "verified at"
    expect(await verifyStepUpCookie(tampered)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const cookie = await signStepUpCookie({ mfaVerifiedAtMs: 1000, lastActivityMs: 2000 });
    const parts = cookie!.split(".");
    parts[2] = parts[2].slice(0, -2) + (parts[2].slice(-2) === "00" ? "ff" : "00");
    expect(await verifyStepUpCookie(parts.join("."))).toBeNull();
  });

  it("rejects malformed input (wrong shape, missing parts, non-numeric)", async () => {
    expect(await verifyStepUpCookie(null)).toBeNull();
    expect(await verifyStepUpCookie(undefined)).toBeNull();
    expect(await verifyStepUpCookie("")).toBeNull();
    expect(await verifyStepUpCookie("not.enough")).toBeNull();
    expect(await verifyStepUpCookie("abc.def.ghi")).toBeNull();
    expect(await verifyStepUpCookie("1000.2000.not-hex!!")).toBeNull();
  });

  it("a cookie signed under one secret fails verification under a different secret (secret rotation invalidates old cookies)", async () => {
    const cookie = await signStepUpCookie({ mfaVerifiedAtMs: 1000, lastActivityMs: 2000 });
    process.env.ADMIN_SESSION_SECRET = "a-different-secret";
    expect(await verifyStepUpCookie(cookie)).toBeNull();
  });

  it("fails closed (returns null) when the secret is unset, for both sign and verify", async () => {
    const cookie = await signStepUpCookie({ mfaVerifiedAtMs: 1000, lastActivityMs: 2000 });
    delete process.env.ADMIN_SESSION_SECRET;
    expect(await signStepUpCookie({ mfaVerifiedAtMs: 1000, lastActivityMs: 2000 })).toBeNull();
    expect(await verifyStepUpCookie(cookie)).toBeNull();
  });
});
