import { describe, expect, it } from "vitest";
import {
  computeStepCompletion,
  decideNewcomerPathUpdate,
  allStepsComplete,
  filledSegments,
  isDismissed,
  type NewcomerPathSettings,
  type StepInputs,
} from "./core";

const complete: StepInputs = {
  hasAvatar: true,
  bioLength: 40,
  boundariesSaved: true,
  hasLimitPractice: true,
  hasFirstPost: true,
};
const nothing: StepInputs = {
  hasAvatar: false,
  bioLength: 0,
  boundariesSaved: false,
  hasLimitPractice: false,
  hasFirstPost: false,
};

describe("computeStepCompletion — A1's four triggers", () => {
  it("profile needs BOTH an avatar and >= 40 chars of About text", () => {
    expect(computeStepCompletion({ ...nothing, hasAvatar: true, bioLength: 40 }).profile).toBe(true);
    expect(computeStepCompletion({ ...nothing, hasAvatar: true, bioLength: 39 }).profile).toBe(false);
    expect(computeStepCompletion({ ...nothing, hasAvatar: false, bioLength: 100 }).profile).toBe(false);
  });

  it("boundaries/limits/firstPost are each their own independent flag", () => {
    expect(computeStepCompletion({ ...nothing, boundariesSaved: true })).toMatchObject({ boundaries: true });
    expect(computeStepCompletion({ ...nothing, hasLimitPractice: true })).toMatchObject({ limits: true });
    expect(computeStepCompletion({ ...nothing, hasFirstPost: true })).toMatchObject({ firstPost: true });
  });

  it("all four true only when every input is satisfied", () => {
    expect(allStepsComplete(computeStepCompletion(complete))).toBe(true);
    expect(allStepsComplete(computeStepCompletion(nothing))).toBe(false);
  });
});

describe("filledSegments — the endowed 5-segment bar", () => {
  it("segment 1 is always filled, even with zero steps done", () => {
    expect(filledSegments(computeStepCompletion(nothing))).toBe(1);
  });

  it("one more filled segment per completed step, up to all 5", () => {
    expect(filledSegments(computeStepCompletion({ ...nothing, hasAvatar: true, bioLength: 40 }))).toBe(2);
    expect(filledSegments(computeStepCompletion(complete))).toBe(5);
  });
});

describe("decideNewcomerPathUpdate — idempotent award, no retro-award (A2/A5)", () => {
  it("first-ever run grandfathers in whatever's already true, with NO award", () => {
    const result = decideNewcomerPathUpdate({}, computeStepCompletion(complete));
    expect(result.newlyAwardedSteps).toEqual([]);
    expect(result.updatedSettings.baselineComputedAt).toBeTruthy();
    expect(result.updatedSettings.awardedSteps).toEqual(["profile", "boundaries", "limits", "firstPost"]);
  });

  it("first-ever run for a brand new member grandfathers nothing (nothing is true yet)", () => {
    const result = decideNewcomerPathUpdate({}, computeStepCompletion(nothing));
    expect(result.newlyAwardedSteps).toEqual([]);
    expect(result.updatedSettings.awardedSteps).toEqual([]);
  });

  it("a later run awards exactly the steps that are newly true", () => {
    const baseline: NewcomerPathSettings = {
      baselineComputedAt: "2026-10-01T00:00:00.000Z",
      awardedSteps: ["profile"],
    };
    const result = decideNewcomerPathUpdate(baseline, computeStepCompletion({ ...nothing, hasAvatar: true, bioLength: 40, boundariesSaved: true }));
    expect(result.newlyAwardedSteps).toEqual(["boundaries"]);
    expect(result.updatedSettings.awardedSteps).toEqual(["profile", "boundaries"]);
  });

  it("re-running with no new completion is a true no-op (idempotent)", () => {
    const baseline: NewcomerPathSettings = {
      baselineComputedAt: "2026-10-01T00:00:00.000Z",
      awardedSteps: ["profile", "boundaries"],
    };
    const completion = computeStepCompletion({ ...nothing, hasAvatar: true, bioLength: 40, boundariesSaved: true });
    const result = decideNewcomerPathUpdate(baseline, completion);
    expect(result.newlyAwardedSteps).toEqual([]);
    expect(result.updatedSettings).toBe(baseline); // same reference — caller can skip the write
  });

  it("a step already awarded never re-fires even if re-checked (idempotent)", () => {
    const baseline: NewcomerPathSettings = {
      baselineComputedAt: "2026-10-01T00:00:00.000Z",
      awardedSteps: ["profile", "boundaries", "limits", "firstPost"],
    };
    const result = decideNewcomerPathUpdate(baseline, computeStepCompletion(complete));
    expect(result.newlyAwardedSteps).toEqual([]);
  });
});

describe("isDismissed — the 24h 'Later' collapse", () => {
  it("not dismissed when no dismissedUntil is set", () => {
    expect(isDismissed({})).toBe(false);
  });

  it("dismissed while dismissedUntil is in the future", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    expect(isDismissed({ dismissedUntil: future })).toBe(true);
  });

  it("no longer dismissed once dismissedUntil has passed", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(isDismissed({ dismissedUntil: past })).toBe(false);
  });
});
