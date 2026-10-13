import { describe, expect, it } from "vitest";
import { canViewPractices } from "./practices-core";

describe("canViewPractices — the B2/B8 visibility matrix", () => {
  it("the owner can always see their own practices", () => {
    expect(canViewPractices("only_me", true, false)).toBe(true);
    expect(canViewPractices("following", true, false)).toBe(true);
    expect(canViewPractices("members", true, false)).toBe(true);
  });

  it("'only_me' hides from everyone else, followed or not", () => {
    expect(canViewPractices("only_me", false, true)).toBe(false);
    expect(canViewPractices("only_me", false, false)).toBe(false);
  });

  it("'following' is visible only to people the owner follows", () => {
    expect(canViewPractices("following", false, true)).toBe(true);
    expect(canViewPractices("following", false, false)).toBe(false);
  });

  it("'members' is visible to any other identified viewer", () => {
    expect(canViewPractices("members", false, false)).toBe(true);
    expect(canViewPractices("members", false, true)).toBe(true);
  });
});
