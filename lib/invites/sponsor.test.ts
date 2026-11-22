import { describe, expect, it } from "vitest";
import { normalizeSponsorCode } from "./sponsor";

describe("normalizeSponsorCode", () => {
  it("trims and lowercases", () => {
    expect(normalizeSponsorCode("  AbC123  ")).toBe("abc123");
  });

  it("empty string becomes null", () => {
    expect(normalizeSponsorCode("")).toBeNull();
  });

  it("whitespace-only becomes null", () => {
    expect(normalizeSponsorCode("   ")).toBeNull();
  });

  it("undefined/null stay null", () => {
    expect(normalizeSponsorCode(undefined)).toBeNull();
    expect(normalizeSponsorCode(null)).toBeNull();
  });
});
