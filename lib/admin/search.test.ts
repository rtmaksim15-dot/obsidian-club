import { describe, expect, it } from "vitest";
import {
  SEARCH_MAX_RESULTS,
  isSearchQueryValid,
  mergeSearchResults,
  normalizeSearchQuery,
  type AdminSearchResult,
} from "./search";

function result(overrides: Partial<AdminSearchResult>): AdminSearchResult {
  return {
    id: "id",
    type: "applicant",
    displayName: "Name",
    handle: null,
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeSearchQuery", () => {
  it("trims whitespace", () => {
    expect(normalizeSearchQuery("  jane  ")).toBe("jane");
  });
});

describe("isSearchQueryValid", () => {
  it("rejects an empty query", () => {
    expect(isSearchQueryValid("")).toBe(false);
  });

  it("rejects a single character", () => {
    expect(isSearchQueryValid("j")).toBe(false);
  });

  it("accepts exactly 2 characters", () => {
    expect(isSearchQueryValid("ja")).toBe(true);
  });

  it("accepts longer queries", () => {
    expect(isSearchQueryValid("jane doe")).toBe(true);
  });
});

describe("mergeSearchResults", () => {
  it("combines both types into one list", () => {
    const applicants = [result({ id: "a1", type: "applicant" })];
    const members = [result({ id: "m1", type: "member" })];
    const merged = mergeSearchResults(applicants, members);
    expect(merged.map((r) => r.id).sort()).toEqual(["a1", "m1"]);
  });

  it("orders most recent first, across both types", () => {
    const applicants = [result({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" })];
    const members = [result({ id: "new", type: "member", createdAt: "2026-06-01T00:00:00.000Z" })];
    const merged = mergeSearchResults(applicants, members);
    expect(merged.map((r) => r.id)).toEqual(["new", "old"]);
  });

  it("caps the combined total at SEARCH_MAX_RESULTS", () => {
    const applicants = Array.from({ length: 15 }, (_, i) =>
      result({ id: `a${i}`, createdAt: new Date(2026, 0, i + 1).toISOString() }),
    );
    const members = Array.from({ length: 15 }, (_, i) =>
      result({ id: `m${i}`, type: "member", createdAt: new Date(2026, 1, i + 1).toISOString() }),
    );
    const merged = mergeSearchResults(applicants, members);
    expect(merged.length).toBe(SEARCH_MAX_RESULTS);
  });

  it("a query matching only one type can fill all 20 slots with that type", () => {
    const applicants = Array.from({ length: 25 }, (_, i) =>
      result({ id: `a${i}`, createdAt: new Date(2026, 0, i + 1).toISOString() }),
    );
    const merged = mergeSearchResults(applicants, []);
    expect(merged.length).toBe(SEARCH_MAX_RESULTS);
    expect(merged.every((r) => r.type === "applicant")).toBe(true);
  });

  it("returns an empty list when nothing matched", () => {
    expect(mergeSearchResults([], [])).toEqual([]);
  });
});
