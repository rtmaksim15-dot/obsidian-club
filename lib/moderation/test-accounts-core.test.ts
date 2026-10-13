import { describe, expect, it } from "vitest";
import { shouldHideTestAccount } from "./test-accounts-core";

describe("shouldHideTestAccount — B6/B7", () => {
  it("hides a test account from a non-admin viewer", () => {
    expect(shouldHideTestAccount(true, false)).toBe(true);
  });

  it("does not hide a test account from an admin viewer", () => {
    expect(shouldHideTestAccount(true, true)).toBe(false);
  });

  it("never hides a real (non-test) account, for anyone", () => {
    expect(shouldHideTestAccount(false, false)).toBe(false);
    expect(shouldHideTestAccount(false, true)).toBe(false);
  });
});
