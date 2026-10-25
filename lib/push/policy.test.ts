import { describe, expect, it } from "vitest";
import { isEligibleForPush, shouldSendPush } from "./policy";

const ELIGIBLE = {
  pushEnabled: true,
  isOwnAction: false,
  isBlocked: false,
  recipientIsTest: false,
  actorIsAdmin: false,
  categoryEnabled: true,
};

describe("isEligibleForPush", () => {
  it("allows when everything is clean", () => {
    expect(isEligibleForPush(ELIGIBLE)).toBe(true);
  });

  it("flag off: never eligible, regardless of everything else", () => {
    expect(isEligibleForPush({ ...ELIGIBLE, pushEnabled: false })).toBe(false);
  });

  it("never notifies the author about their own action", () => {
    expect(isEligibleForPush({ ...ELIGIBLE, isOwnAction: true })).toBe(false);
  });

  it("respects a block either way", () => {
    expect(isEligibleForPush({ ...ELIGIBLE, isBlocked: true })).toBe(false);
  });

  it("skips a test-account recipient when the actor is not an admin", () => {
    expect(isEligibleForPush({ ...ELIGIBLE, recipientIsTest: true, actorIsAdmin: false })).toBe(false);
  });

  it("does NOT skip a test-account recipient when the actor is an admin", () => {
    expect(isEligibleForPush({ ...ELIGIBLE, recipientIsTest: true, actorIsAdmin: true })).toBe(true);
  });

  it("respects the recipient's own preference for this category", () => {
    expect(isEligibleForPush({ ...ELIGIBLE, categoryEnabled: false })).toBe(false);
  });
});

describe("shouldSendPush — adds the throttle as a final gate", () => {
  it("allowed when isEligibleForPush is true AND the throttle allows", () => {
    expect(shouldSendPush({ ...ELIGIBLE, throttleAllowed: true })).toBe(true);
  });

  it("denied when otherwise eligible but the throttle doesn't allow it", () => {
    expect(shouldSendPush({ ...ELIGIBLE, throttleAllowed: false })).toBe(false);
  });

  it("denied when ineligible even if the throttle would allow it", () => {
    expect(shouldSendPush({ ...ELIGIBLE, isBlocked: true, throttleAllowed: true })).toBe(false);
  });
});
