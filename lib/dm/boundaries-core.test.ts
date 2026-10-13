import { describe, expect, it } from "vitest";
import { evaluateBoundaries, DEFAULT_BOUNDARIES, type BoundariesSettings } from "./boundaries-core";

const base: BoundariesSettings = DEFAULT_BOUNDARIES;

describe("evaluateBoundaries — the allowed/denied matrix for a new conversation request", () => {
  it("default settings (members, acceptRequests true) allow anyone", () => {
    expect(evaluateBoundaries(base, false)).toEqual({ allowed: true });
    expect(evaluateBoundaries(base, true)).toEqual({ allowed: true });
  });

  it("whoCanMessage 'members' allows a non-followed sender too", () => {
    expect(evaluateBoundaries({ ...base, whoCanMessage: "members" }, false)).toEqual({ allowed: true });
  });

  it("whoCanMessage 'following' allows only a sender the recipient follows", () => {
    expect(evaluateBoundaries({ ...base, whoCanMessage: "following" }, true)).toEqual({ allowed: true });
    expect(evaluateBoundaries({ ...base, whoCanMessage: "following" }, false)).toEqual({
      allowed: false,
      reason: "This member only accepts first messages from people they follow.",
    });
  });

  it("whoCanMessage 'nobody_new' denies everyone, followed or not", () => {
    expect(evaluateBoundaries({ ...base, whoCanMessage: "nobody_new" }, true)).toEqual({
      allowed: false,
      reason: "This member is not receiving new conversations.",
    });
    expect(evaluateBoundaries({ ...base, whoCanMessage: "nobody_new" }, false)).toEqual({
      allowed: false,
      reason: "This member is not receiving new conversations.",
    });
  });

  it("acceptRequests=false denies everyone regardless of whoCanMessage", () => {
    expect(evaluateBoundaries({ ...base, whoCanMessage: "members", acceptRequests: false }, false)).toEqual({
      allowed: false,
      reason: "This member is not receiving new conversations.",
    });
    expect(evaluateBoundaries({ ...base, whoCanMessage: "following", acceptRequests: false }, true)).toEqual({
      allowed: false,
      reason: "This member is not receiving new conversations.",
    });
  });
});
