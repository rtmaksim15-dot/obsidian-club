import { describe, expect, it, vi } from "vitest";

// lib/dm/limits.ts imports "server-only" (same guard every server-only
// lib/ module in this codebase uses) — mocked here the same way
// lib/age-verification/yoti.test.ts already does, rather than
// splitting a single constant out into its own core module. Imported
// dynamically inside the test (not a top-level await — this repo's
// tsconfig target doesn't support that) so the mock above is already
// in place first.
vi.mock("server-only", () => ({}));

// Package 4 follow-up (2026-10-13, see DECISIONS.md) — raised 5 -> 10,
// then reverted the same day. A single-constant regression guard so a
// future change here is a deliberate edit to this test too, not a
// silent drift the way the hardcoded error-message copy once was
// (app/api/dm/requests/route.ts, fixed to read this constant directly
// during the original Phase A pass).
describe("DAILY_REQUEST_LIMIT", () => {
  it("is 5 (reverted back from the Phase A raise to 10)", async () => {
    const { DAILY_REQUEST_LIMIT } = await import("./limits");
    expect(DAILY_REQUEST_LIMIT).toBe(5);
  });
});
