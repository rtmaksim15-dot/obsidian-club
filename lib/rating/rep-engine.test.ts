import { beforeEach, describe, expect, it, vi } from "vitest";

// rep-engine.ts's `awardRep` now delegates its actual write to
// lib/rep/ledger.ts (package 1b, 2026-10-01, see DECISIONS.md) — this
// suite only checks that delegation maps the right arguments, not the DB
// behavior itself (that's lib/rep/ledger.test.ts's job). Mock the ledger
// module directly rather than Prisma.
const calls = vi.hoisted(() => ({
  awardRep: [] as unknown[],
  applyAdjustment: [] as unknown[],
}));

vi.mock("@/lib/rep/ledger", () => ({
  awardRep: vi.fn(async (input: unknown) => {
    calls.awardRep.push(input);
    return { outcome: "awarded", delta: 0, capped: false, repHistoryId: "rh_1" };
  }),
  applyAdjustment: vi.fn(async (input: unknown) => {
    calls.applyAdjustment.push(input);
    return { outcome: "applied", delta: 0, repHistoryId: "rh_1" };
  }),
}));

const fakeAggregateSum = vi.hoisted(() => ({ value: 0 as number | null }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    repHistory: {
      aggregate: vi.fn(async () => ({ _sum: { delta: fakeAggregateSum.value } })),
    },
  },
}));

import { awardRep, awardRepWithDailyCap } from "./rep-engine";

beforeEach(() => {
  calls.awardRep.length = 0;
  calls.applyAdjustment.length = 0;
  fakeAggregateSum.value = 0;
});

describe("rep-engine.ts#awardRep — legacy delegation to lib/rep/ledger.ts", () => {
  it("is a no-op for 0 points, exactly as before (no ledger call at all)", async () => {
    await awardRep("u1", 0, "nothing", "nothing");
    expect(calls.awardRep).toHaveLength(0);
    expect(calls.applyAdjustment).toHaveLength(0);
  });

  it.each([
    ["login-streak", 5, "daily_login"],
    ["login-streak", 50, "login_streak_7"],
    ["login-streak", 300, "login_streak_30"],
    ["profile-complete", 100, "profile_complete"],
    ["first-post", 5, "first_post"],
    ["house-post", 2, "house_post"],
    ["house-joined", 10, "house_joined"],
    ["first-community-intro", 100, "first_community_intro"],
  ])("maps source %s at %i points to reasonCode %s", async (source, points, reasonCode) => {
    await awardRep("u1", points, "some reason", source);
    expect(calls.awardRep).toHaveLength(1);
    // `value` is deliberately NOT forwarded (package 1d) — the catalog in
    // lib/rep/config.ts is authoritative on the actual amount now, not
    // this call's own (legacy, possibly stale) `points` figure.
    expect(calls.awardRep[0]).toMatchObject({
      userId: "u1",
      reasonCode,
      sourceType: source,
      sourceId: undefined,
      bypassCap: true,
      legacyReason: "some reason",
      legacySource: source,
    });
    expect(calls.awardRep[0]).not.toHaveProperty("value");
  });

  it("splits a templated source into sourceType/sourceId", async () => {
    await awardRep("inviter1", 500, "Your invitee reached Level II", "invitee-level-2:invitee42");
    expect(calls.awardRep[0]).toMatchObject({
      reasonCode: "invitee_level_2",
      sourceType: "invitee-level-2",
      sourceId: "invitee42",
    });

    await awardRep("inviter1", 1000, "Invitee active 90 days", "referral-active-90d:ref99");
    expect(calls.awardRep[1]).toMatchObject({
      reasonCode: "invitee_active_90d",
      sourceType: "referral-active-90d",
      sourceId: "ref99",
    });
  });

  it("preserves the same-transaction rep.granted analytics guarantee (amount itself is filled in by ledger.ts, not this call)", async () => {
    await awardRep("u1", 50, "First post", "first-post");
    expect(calls.awardRep[0]).toMatchObject({
      emitAnalyticsEvent: { type: "rep.granted", meta: { reason: "First post", sourceEvent: "first-post" } },
    });
    expect((calls.awardRep[0] as { emitAnalyticsEvent: { meta: object } }).emitAnalyticsEvent.meta).not.toHaveProperty("amount");
  });

  it("routes admin-adjustment through applyAdjustment, not awardRep, preserving an arbitrary signed delta", async () => {
    await awardRep("member1", -250, "Rule violation (manual)", "admin-adjustment");
    expect(calls.awardRep).toHaveLength(0);
    expect(calls.applyAdjustment).toHaveLength(1);
    expect(calls.applyAdjustment[0]).toMatchObject({
      userId: "member1",
      delta: -250,
      reasonCode: "admin_adjustment",
      sourceType: "admin-adjustment",
      legacyReason: "Rule violation (manual)",
      legacySource: "admin-adjustment",
    });

    await awardRep("member1", 300, "Bonus (manual)", "admin-adjustment");
    expect(calls.applyAdjustment[1]).toMatchObject({ delta: 300 });
  });

  it("throws for an unmapped source instead of silently dropping the award", async () => {
    await expect(awardRep("u1", 42, "mystery", "totally-unmapped-source")).rejects.toThrow(/no REP catalog mapping/);
  });
});

describe("rep-engine.ts#awardRepWithDailyCap — daily cap gate is unchanged and still enforced", () => {
  it("delegates through to awardRep when under the cap", async () => {
    fakeAggregateSum.value = 4; // 2 house-posts so far today (2 each)
    await awardRepWithDailyCap("u1", 2, "Posted in a House", "house-post", 10);
    expect(calls.awardRep).toHaveLength(1);
    expect(calls.awardRep[0]).toMatchObject({ reasonCode: "house_post", sourceType: "house-post" });
  });

  it("skips the call to awardRep entirely once today's total reaches the cap", async () => {
    fakeAggregateSum.value = 10; // already at the 10/day cap
    await awardRepWithDailyCap("u1", 2, "Posted in a House", "house-post", 10);
    expect(calls.awardRep).toHaveLength(0);
  });

  it("still gates correctly even though house_post is re-priced to 0 (the aggregate reads the legacy `source` column, untouched by the re-price)", async () => {
    fakeAggregateSum.value = 0;
    await awardRepWithDailyCap("u1", 2, "Posted in a House", "house-post", 10);
    expect(calls.awardRep).toHaveLength(1); // the gate itself still runs; the catalog separately zeroes the actual award
  });
});
