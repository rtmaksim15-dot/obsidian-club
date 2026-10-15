import { describe, expect, it } from "vitest";
import { isAccountLockedOut } from "./account-lockout";

describe("isAccountLockedOut", () => {
  it("under the threshold: not locked out", () => {
    expect(isAccountLockedOut(4, 5)).toBe(false);
  });

  it("at the threshold: locked out", () => {
    expect(isAccountLockedOut(5, 5)).toBe(true);
  });

  it("over the threshold: still locked out", () => {
    expect(isAccountLockedOut(9, 5)).toBe(true);
  });

  it("zero failures: not locked out", () => {
    expect(isAccountLockedOut(0, 5)).toBe(false);
  });
});
