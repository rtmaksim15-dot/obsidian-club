import { describe, expect, it } from "vitest";
import { isServiceWorkerEnabled } from "./sw-config";

describe("isServiceWorkerEnabled — the SW kill switch (NEXT_PUBLIC_SW_ENABLED)", () => {
  it("unset (undefined) defaults to enabled", () => {
    expect(isServiceWorkerEnabled(undefined)).toBe(true);
  });

  it("the literal string \"false\" disables it", () => {
    expect(isServiceWorkerEnabled("false")).toBe(false);
  });

  it("any other value (including \"true\" or a typo) stays enabled", () => {
    expect(isServiceWorkerEnabled("true")).toBe(true);
    expect(isServiceWorkerEnabled("flase")).toBe(true);
    expect(isServiceWorkerEnabled("")).toBe(true);
  });
});
