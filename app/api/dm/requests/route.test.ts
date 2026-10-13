import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Package 4 follow-up, bug fix (2026-10-13, see DECISIONS.md) — a new
// DM request from a profile failed with a generic "Could not send"
// error. Root cause: this route's transaction was the only place in
// the whole codebase running at isolationLevel: Serializable; Phase A
// added two new reads inside it (lib/dm/boundaries.ts's
// getBoundariesVerdict), broadening the predicate-lock surface enough
// that a normal single request could hit a spurious Postgres
// "could not serialize access" failure (40001) — an error that isn't
// an EligibilityError, so it fell through to the generic catch-all
// instead of a real reason.
//
// There's no mocked-Prisma/real-Postgres route-handler test harness in
// this codebase (same gap as Phase A/B's other route-level skips — see
// TECH_DEBT.md), so a genuine concurrent-transaction regression test
// isn't possible here. This is a source-inspection guard instead: it
// fails loudly if `isolationLevel`/`Serializable` ever reappears on
// this route's transaction, which is the specific thing that must not
// regress, even though it can't exercise the actual failure mode.
describe("POST /api/dm/requests — no explicit transaction isolation level", () => {
  it("does not reintroduce Prisma.TransactionIsolationLevel.Serializable", () => {
    const source = readFileSync(join(__dirname, "route.ts"), "utf8");
    // Checks for the actual code construct, not just the words "isolationLevel"/
    // "Serializable" anywhere — this comment, and the route's own
    // explanatory comment, both legitimately mention them in prose.
    expect(source).not.toMatch(/Prisma\.TransactionIsolationLevel/);
    expect(source).not.toMatch(/\{\s*isolationLevel\s*:/);
  });
});
