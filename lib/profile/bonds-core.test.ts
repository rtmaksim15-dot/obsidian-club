import { describe, expect, it } from "vitest";
import { canAddActiveBond, describeBondForOwner, MAX_ACTIVE_BONDS } from "./bonds-core";

describe("canAddActiveBond — B3/B8 max-3 active bonds", () => {
  it("allows adding below the cap", () => {
    expect(canAddActiveBond(0)).toBe(true);
    expect(canAddActiveBond(2)).toBe(true);
  });

  it("denies at and above the cap", () => {
    expect(canAddActiveBond(MAX_ACTIVE_BONDS)).toBe(false);
    expect(canAddActiveBond(MAX_ACTIVE_BONDS + 1)).toBe(false);
  });
});

describe("describeBondForOwner", () => {
  it("'partner' reads the same from either side", () => {
    expect(describeBondForOwner("partner", true, "Alex")).toBe("Partner of Alex");
    expect(describeBondForOwner("partner", false, "Alex")).toBe("Partner of Alex");
  });

  it("'dominant_of' flips depending on which side is viewing", () => {
    expect(describeBondForOwner("dominant_of", true, "Alex")).toBe("Dominant of Alex");
    expect(describeBondForOwner("dominant_of", false, "Alex")).toBe("Submissive to Alex");
  });

  it("'submissive_of' flips the other way", () => {
    expect(describeBondForOwner("submissive_of", true, "Alex")).toBe("Submissive to Alex");
    expect(describeBondForOwner("submissive_of", false, "Alex")).toBe("Dominant of Alex");
  });
});
