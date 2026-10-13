import { describe, expect, it } from "vitest";
import { assignMemberNumbers, formatMemberNumber } from "./member-number";

describe("assignMemberNumbers — the B1 backfill ordering rule", () => {
  it("numbers by joinedAt ascending, excluding the given id", () => {
    const founder = "founder-id";
    const users = [
      { id: "c", joinedAt: new Date("2026-03-01"), createdAt: new Date("2026-03-01") },
      { id: founder, joinedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01") },
      { id: "a", joinedAt: new Date("2026-01-15"), createdAt: new Date("2026-01-15") },
      { id: "b", joinedAt: new Date("2026-02-01"), createdAt: new Date("2026-02-01") },
    ];
    const result = assignMemberNumbers(users, founder);
    expect(result.get("a")).toBe(1);
    expect(result.get("b")).toBe(2);
    expect(result.get("c")).toBe(3);
    expect(result.has(founder)).toBe(false);
  });

  it("falls back to createdAt when joinedAt is null", () => {
    const users = [
      { id: "x", joinedAt: null, createdAt: new Date("2026-01-10") },
      { id: "y", joinedAt: new Date("2026-01-05"), createdAt: new Date("2026-01-05") },
    ];
    const result = assignMemberNumbers(users, "nobody");
    expect(result.get("y")).toBe(1);
    expect(result.get("x")).toBe(2);
  });
});

describe("formatMemberNumber", () => {
  it("shows 'Founder' for the founder account, ignoring any number", () => {
    expect(formatMemberNumber(7, true)).toBe("Founder");
    expect(formatMemberNumber(null, true)).toBe("Founder");
  });

  it("zero-pads an ordinary member's number to 4 digits", () => {
    expect(formatMemberNumber(42, false)).toBe("Member № 0042");
    expect(formatMemberNumber(1, false)).toBe("Member № 0001");
    expect(formatMemberNumber(12345, false)).toBe("Member № 12345");
  });

  it("is blank for a non-founder with no number yet assigned", () => {
    expect(formatMemberNumber(null, false)).toBe("");
  });
});
