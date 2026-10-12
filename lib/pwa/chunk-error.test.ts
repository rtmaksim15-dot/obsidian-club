import { describe, expect, it } from "vitest";
import { isChunkLoadError, shouldAutoReloadForChunkError } from "./chunk-error";

describe("isChunkLoadError", () => {
  it("recognizes webpack's ChunkLoadError by name", () => {
    const error = new Error("some message");
    error.name = "ChunkLoadError";
    expect(isChunkLoadError(error)).toBe(true);
  });

  it("recognizes the 'Loading chunk N failed' message shape", () => {
    expect(isChunkLoadError(new Error("Loading chunk 42 failed."))).toBe(true);
  });

  it("recognizes the CSS chunk variant", () => {
    expect(isChunkLoadError(new Error("Loading CSS chunk 7 failed."))).toBe(true);
  });

  it("is false for an ordinary error", () => {
    expect(isChunkLoadError(new Error("Something else broke"))).toBe(false);
  });

  it("is false for a non-Error value", () => {
    expect(isChunkLoadError("just a string")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("shouldAutoReloadForChunkError — one automatic reload, then stop (no loop)", () => {
  it("reloads on the first attempt", () => {
    expect(shouldAutoReloadForChunkError(false)).toBe(true);
  });

  it("does not reload again once already attempted", () => {
    expect(shouldAutoReloadForChunkError(true)).toBe(false);
  });
});
