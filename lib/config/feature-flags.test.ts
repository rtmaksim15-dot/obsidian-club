import { describe, expect, it } from "vitest";
import { NEWCOMER_PATH_ENABLED, PRACTICES_UI_ENABLED } from "./feature-flags";

// Hide Newcomer Path + Practices (founder decision, 2026-10-22, see
// DECISIONS.md) — "too much load for members." Both default off.
describe("Newcomer Path + Practices flags", () => {
  it("both default to false", () => {
    expect(NEWCOMER_PATH_ENABLED).toBe(false);
    expect(PRACTICES_UI_ENABLED).toBe(false);
  });
});
