import { describe, expect, it } from "vitest";
import {
  REP_NUMBER_ENABLED,
  REP_HISTORY_UI_ENABLED,
  REVIEWS_UI_ENABLED,
  TRUST_SCORE_UI_ENABLED,
  LEVELS_UI_ENABLED,
  LEVEL_PROGRESS_UI_ENABLED,
} from "./feature-flags";

// Package 2's task context describes "REP_UI_ENABLED (must stay false
// in production)" — that exact flag no longer exists. It was split on
// 2026-09-27 (see lib/config/feature-flags.ts's own header comments
// and DECISIONS.md) into REP_NUMBER_ENABLED, REP_HISTORY_UI_ENABLED,
// REVIEWS_UI_ENABLED, and TRUST_SCORE_UI_ENABLED, as an *already-live,
// deliberate* product decision — REP_NUMBER_ENABLED (and the separate
// LEVELS_UI_ENABLED) are currently `true`, and that's correct, not a
// leak this test should fight. What rep-core's merge must not have
// done is flip anything *else* on: it adds new, currently-unused
// fields/tables (trustStars/titleLevel/councilEligible, lib/rep/
// ledger.ts) with no UI reading them yet, and it never touches this
// file at all (confirmed: zero commits in rep-core's 5-commit range
// modify feature-flags.ts).
describe("REP feature flags — reconciling rep-core didn't flip anything", () => {
  it("the genuinely-deferred REP sub-features stay off", () => {
    expect(REP_HISTORY_UI_ENABLED).toBe(false);
    expect(REVIEWS_UI_ENABLED).toBe(false);
    expect(TRUST_SCORE_UI_ENABLED).toBe(false);
    expect(LEVEL_PROGRESS_UI_ENABLED).toBe(false);
  });

  it("documents (not fights) the pre-existing, deliberate exception: the REP number and level name/ring are already live", () => {
    expect(REP_NUMBER_ENABLED).toBe(true);
    expect(LEVELS_UI_ENABLED).toBe(true);
  });
});
