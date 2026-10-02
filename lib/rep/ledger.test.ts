import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyPenalty, awardRep, getRepSummary, recomputeUser, titleFor } from "./ledger";

// `server-only` throws on plain import outside Next.js's "react-server"
// webpack condition (see node_modules/server-only/index.js) — harmless in
// the real app (bundled under that condition), but needs a stub here so
// vitest (plain Node) can import lib/rep/ledger.ts at all.
vi.mock("server-only", () => ({}));

type FakeUser = {
  id: string;
  rep: number;
  trustStars: number;
  titleLevel: number;
  councilEligible: boolean;
};

type FakeRow = {
  id: string;
  userId: string;
  delta: number;
  category: string | null;
  baseDelta: number | null;
  multiplier: number | null;
  sourceType: string | null;
  sourceId: string | null;
  reasonCode: string | null;
  note: string | null;
  grantedById: string | null;
  createdAt: Date;
};

type WhereCondition = null | { gt?: number; gte?: Date; not?: unknown } | string | number;

// Minimal in-memory fake of the subset of the Prisma Client API
// lib/rep/ledger.ts actually calls — no real database involved. Defined
// via vi.hoisted so its state is reachable from the vi.mock factory below
// (factories only see hoisted bindings).
const state = vi.hoisted(() => ({
  users: new Map<string, FakeUser>(),
  repHistory: [] as FakeRow[],
  idCounter: 0,
}));

function pick<T extends Record<string, unknown>>(obj: T, select?: Record<string, boolean>): Partial<T> {
  if (!select) return { ...obj };
  const out: Partial<T> = {};
  for (const k of Object.keys(select)) {
    if (select[k]) out[k as keyof T] = obj[k as keyof T];
  }
  return out;
}

function matchesWhere(row: FakeRow, where: Record<string, WhereCondition>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    const val = row[key as keyof FakeRow];
    if (cond === null) {
      if (val !== null) return false;
    } else if (typeof cond === "object") {
      if (cond.gt !== undefined && !((val as number) > cond.gt)) return false;
      if (cond.gte !== undefined && !(new Date(val as Date) >= cond.gte)) return false;
      if ("not" in cond) {
        const isEqual = cond.not === null ? val === null : val === cond.not;
        if (isEqual) return false;
      }
    } else if (val !== cond) {
      return false;
    }
  }
  return true;
}

type FakeDb = {
  user: {
    findUniqueOrThrow: (args: { where: { id: string }; select?: Record<string, boolean> }) => Promise<Partial<FakeUser>>;
    update: (args: {
      where: { id: string };
      data: Omit<Partial<FakeUser>, "rep"> & { rep?: number | { increment: number } };
    }) => Promise<FakeUser>;
  };
  repHistory: {
    findUnique: (args: {
      where: { userId_sourceType_sourceId_reasonCode?: Pick<FakeRow, "userId" | "sourceType" | "sourceId" | "reasonCode"> };
    }) => Promise<FakeRow | null>;
    create: (args: { data: Partial<FakeRow> & Pick<FakeRow, "userId" | "delta"> }) => Promise<FakeRow>;
    aggregate: (args: { where: Record<string, WhereCondition> }) => Promise<{ _sum: { delta: number | null } }>;
    groupBy: (args: {
      by: (keyof FakeRow)[];
      where: Record<string, WhereCondition>;
    }) => Promise<Record<string, unknown>[]>;
  };
  $transaction: (fn: (tx: FakeDb) => unknown) => Promise<unknown>;
};

vi.mock("@/lib/db/prisma", () => {
  const db: FakeDb = {
    user: {
      findUniqueOrThrow: async ({ where, select }) => {
        const u = state.users.get(where.id);
        if (!u) throw new Error(`user not found: ${where.id}`);
        return pick(u, select);
      },
      update: async ({ where, data }) => {
        const u = state.users.get(where.id);
        if (!u) throw new Error(`user not found: ${where.id}`);
        if (data.rep && typeof data.rep === "object" && "increment" in data.rep) u.rep += data.rep.increment;
        else if (typeof data.rep === "number") u.rep = data.rep;
        if (data.titleLevel !== undefined) u.titleLevel = data.titleLevel;
        if (data.councilEligible !== undefined) u.councilEligible = data.councilEligible;
        if (data.trustStars !== undefined) u.trustStars = data.trustStars;
        return { ...u };
      },
    },
    repHistory: {
      findUnique: async ({ where }) => {
        const key = where.userId_sourceType_sourceId_reasonCode;
        if (!key) return null;
        return (
          state.repHistory.find(
            (r) =>
              r.userId === key.userId &&
              r.sourceType === key.sourceType &&
              r.sourceId === key.sourceId &&
              r.reasonCode === key.reasonCode,
          ) ?? null
        );
      },
      create: async ({ data }) => {
        const row: FakeRow = {
          id: `rh_${++state.idCounter}`,
          createdAt: new Date(),
          category: null,
          baseDelta: null,
          multiplier: null,
          sourceType: null,
          sourceId: null,
          reasonCode: null,
          note: null,
          grantedById: null,
          ...data,
        };
        state.repHistory.push(row);
        return row;
      },
      aggregate: async ({ where }) => {
        const rows = state.repHistory.filter((r) => matchesWhere(r, where));
        const sum = rows.reduce((s, r) => s + r.delta, 0);
        return { _sum: { delta: rows.length ? sum : null } };
      },
      groupBy: async ({ by, where }) => {
        const rows = state.repHistory.filter((r) => matchesWhere(r, where));
        const groups = new Map<string, { keyVals: Record<string, unknown>; sum: number }>();
        for (const r of rows) {
          const keyVals: Record<string, unknown> = {};
          for (const k of by) keyVals[k] = r[k];
          const key = JSON.stringify(keyVals);
          const g = groups.get(key) ?? { keyVals, sum: 0 };
          g.sum += r.delta;
          groups.set(key, g);
        }
        return Array.from(groups.values()).map((g) => ({ ...g.keyVals, _sum: { delta: g.sum } }));
      },
    },
    $transaction: async (fn) => fn(db),
  };
  return { prisma: db };
});

function seedUser(overrides: Partial<FakeUser> = {}) {
  const user: FakeUser = { id: "u1", rep: 0, trustStars: 3, titleLevel: 1, councilEligible: false, ...overrides };
  state.users.set(user.id, user);
  return user;
}

beforeEach(() => {
  state.users.clear();
  state.repHistory.length = 0;
  state.idCounter = 0;
});

describe("titleFor", () => {
  it("maps score to the right title", () => {
    expect(titleFor(0)).toEqual({ level: 1, name: "Initiate" });
    expect(titleFor(999)).toEqual({ level: 1, name: "Initiate" });
    expect(titleFor(1000)).toEqual({ level: 2, name: "Keeper" });
    expect(titleFor(10000)).toEqual({ level: 5, name: "Master" });
    expect(titleFor(999999)).toEqual({ level: 5, name: "Master" }); // never 6 — see "Council never auto-assigned" below
  });
});

describe("awardRep — multiplier per star level", () => {
  it.each([
    [1, 40],
    [2, 70],
    [3, 100],
    [4, 110],
    [5, 120],
  ])("stars=%i applies a %i delta to a 100-point reason", async (stars, expected) => {
    seedUser({ trustStars: stars });
    const result = await awardRep({ userId: "u1", reasonCode: "profile_verified", sourceType: "test", sourceId: `s-${stars}` });
    expect(result).toMatchObject({ outcome: "awarded", delta: expected });
  });
});

describe("awardRep — monthly cap trimming", () => {
  it("trims a second award to the remaining cap for its category", async () => {
    seedUser(); // trustStars 3 → multiplier 1.0, no rounding noise
    // event_organized (200-500) and club_project (100-300) are both
    // CLUB_VALUE — they share one monthly cap pool (600).
    const first = await awardRep({ userId: "u1", reasonCode: "event_organized", value: 500, sourceType: "test", sourceId: "a" });
    expect(first).toMatchObject({ outcome: "awarded", delta: 500, capped: false });

    // 100 remains of the 600 CLUB_VALUE cap.
    const second = await awardRep({ userId: "u1", reasonCode: "club_project", value: 300, sourceType: "test", sourceId: "b" });
    expect(second).toMatchObject({ outcome: "awarded", delta: 100, capped: true });
  });

  it("returns capped with delta 0 once the cap is fully used", async () => {
    seedUser();
    await awardRep({ userId: "u1", reasonCode: "event_organized", value: 500, sourceType: "test", sourceId: "a" });
    await awardRep({ userId: "u1", reasonCode: "club_project", value: 100, sourceType: "test", sourceId: "b" }); // exactly fills the 600 cap
    const third = await awardRep({ userId: "u1", reasonCode: "club_project", value: 100, sourceType: "test", sourceId: "c" });
    expect(third).toEqual({ outcome: "capped", delta: 0 });
  });
});

describe("awardRep — admin bypass", () => {
  it("ignores the monthly cap entirely when grantedBy is set", async () => {
    seedUser();
    await awardRep({ userId: "u1", reasonCode: "event_organized", value: 500, sourceType: "test", sourceId: "a" });
    // Already at 500/600 for CLUB_VALUE this month — a normal award would
    // trim to 100, but an admin grant takes the full value.
    const granted = await awardRep({
      userId: "u1",
      reasonCode: "club_project",
      value: 300,
      sourceType: "admin",
      sourceId: "b",
      grantedBy: "admin-1",
    });
    expect(granted).toMatchObject({ outcome: "awarded", delta: 300, capped: false });
  });
});

describe("applyPenalty — never multiplied or capped", () => {
  it("applies the raw value even at a high trust-star multiplier", async () => {
    seedUser({ trustStars: 5 }); // would be a 1.2x multiplier on the earning path
    const result = await applyPenalty({ userId: "u1", reasonCode: "mod_warning", grantedBy: "admin-1", sourceType: "mod", sourceId: "m1" });
    expect(result).toMatchObject({ outcome: "applied", delta: -50 });
    expect(state.users.get("u1")?.rep).toBe(-50);
  });

  it("requires grantedBy", async () => {
    seedUser();
    // @ts-expect-error — grantedBy omitted on purpose
    await expect(applyPenalty({ userId: "u1", reasonCode: "mod_warning", sourceType: "mod", sourceId: "m1" })).rejects.toThrow(
      /grantedBy/,
    );
  });
});

describe("idempotent duplicate", () => {
  it("returns the original row on a repeated (userId, sourceType, sourceId, reasonCode)", async () => {
    seedUser();
    await awardRep({ userId: "u1", reasonCode: "profile_verified", sourceType: "verify", sourceId: "v1" });
    const second = await awardRep({ userId: "u1", reasonCode: "profile_verified", sourceType: "verify", sourceId: "v1" });
    expect(second.outcome).toBe("duplicate");
    expect(state.repHistory.length).toBe(1); // no second row written
    expect(state.users.get("u1")?.rep).toBe(100); // not double-awarded
  });
});

describe("title high-water mark", () => {
  it("never drops titleLevel when rep later drops from a penalty", async () => {
    seedUser();
    await awardRep({ userId: "u1", reasonCode: "club_project", value: 300, sourceType: "admin", sourceId: "a", grantedBy: "admin-1" });
    await awardRep({ userId: "u1", reasonCode: "club_project", value: 300, sourceType: "admin", sourceId: "b", grantedBy: "admin-1" });
    await awardRep({ userId: "u1", reasonCode: "club_project", value: 300, sourceType: "admin", sourceId: "c", grantedBy: "admin-1" });
    await awardRep({ userId: "u1", reasonCode: "club_project", value: 100, sourceType: "admin", sourceId: "d", grantedBy: "admin-1" });
    expect(state.users.get("u1")?.rep).toBe(1000);
    expect(state.users.get("u1")?.titleLevel).toBe(2); // Keeper

    await applyPenalty({ userId: "u1", reasonCode: "rule_violation", value: -500, grantedBy: "admin-1", sourceType: "mod", sourceId: "p1" });
    expect(state.users.get("u1")?.rep).toBe(500); // back under the Keeper threshold
    expect(state.users.get("u1")?.titleLevel).toBe(2); // ...but the title stays
  });
});

describe("Council eligibility", () => {
  it("sets councilEligible at 20000 rep without ever auto-assigning titleLevel 6", async () => {
    seedUser();
    // No single catalog entry reaches 20000 (the largest, event_organized,
    // caps at 500) — recomputeUser sums the whole ledger, so seed it with
    // a synthetic large ledger row the way years of real accrual would,
    // rather than writing to the cached `rep` field directly (that field
    // is exactly what recomputeUser is meant to rebuild, not trust).
    state.repHistory.push({
      id: "big1",
      userId: "u1",
      delta: 20000,
      category: "ADJUSTMENT",
      baseDelta: 20000,
      multiplier: 1,
      sourceType: "test",
      sourceId: "big-adj",
      reasonCode: null,
      note: null,
      grantedById: "admin-1",
      createdAt: new Date(),
    });

    const recomputed = await recomputeUser("u1");
    expect(recomputed.rep).toBe(20000);
    expect(recomputed.councilEligible).toBe(true);
    expect(recomputed.titleLevel).toBe(5); // Master — the highest titleFor() ever returns
  });
});

describe("getRepSummary — floor-at-0 display", () => {
  it("floors a negative stored rep to 0 for display without altering the stored value", async () => {
    seedUser({ rep: -50 });
    const summary = await getRepSummary("u1");
    expect(summary.repScore).toBe(0);
    expect(state.users.get("u1")?.rep).toBe(-50); // the ledger's true value is untouched
  });
});
