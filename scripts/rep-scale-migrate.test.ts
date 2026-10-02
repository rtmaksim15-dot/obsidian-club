import { beforeEach, describe, expect, it } from "vitest";
import { appendScaleMigrationRow, planForUser, recomputeUserLocal, type MigratePrisma, type UserRow } from "./rep-scale-migrate";

type FakeUser = UserRow;
type FakeRow = {
  id: string;
  userId: string;
  delta: number;
  category: string;
  sourceType: string;
  sourceId: string;
  reasonCode: string;
};

const state = {
  users: new Map<string, FakeUser>(),
  repHistory: [] as FakeRow[],
  idCounter: 0,
};

function makeFakePrisma(): MigratePrisma {
  const db: MigratePrisma = {
    repHistory: {
      findUnique: async ({ where }) => {
        const key = where.userId_sourceType_sourceId_reasonCode;
        return (
          state.repHistory.find(
            (r) => r.userId === key.userId && r.sourceType === key.sourceType && r.sourceId === key.sourceId && r.reasonCode === key.reasonCode,
          ) ?? null
        );
      },
      create: async ({ data }) => {
        const row = { id: `rh_${++state.idCounter}`, ...data } as FakeRow;
        state.repHistory.push(row);
        return row;
      },
      aggregate: async ({ where }) => {
        const rows = state.repHistory.filter((r) => r.userId === where.userId);
        const sum = rows.reduce((s, r) => s + r.delta, 0);
        return { _sum: { delta: rows.length ? sum : null } };
      },
    },
    user: {
      update: async ({ where, data }) => {
        const u = state.users.get(where.id);
        if (!u) throw new Error("not found");
        if (data.rep && typeof data.rep === "object" && "increment" in data.rep) u.rep += data.rep.increment;
        else if (typeof data.rep === "number") u.rep = data.rep;
        if (data.titleLevel !== undefined) u.titleLevel = data.titleLevel;
        if (data.councilEligible !== undefined) u.councilEligible = data.councilEligible;
        if (data.repExempt !== undefined) u.repExempt = data.repExempt;
        return { ...u };
      },
      findUniqueOrThrow: async ({ where }) => {
        const u = state.users.get(where.id);
        if (!u) throw new Error("not found");
        return u;
      },
    },
    $transaction: async (fn) => fn(db),
  };
  return db;
}

function seedUser(overrides: Partial<FakeUser> = {}): FakeUser {
  const user: FakeUser = { id: "u1", email: "member@example.com", rep: 100, titleLevel: 1, councilEligible: false, repExempt: false, ...overrides };
  state.users.set(user.id, user);
  return user;
}

beforeEach(() => {
  state.users.clear();
  state.repHistory.length = 0;
  state.idCounter = 0;
});

describe("planForUser — pure, no DB", () => {
  it("scales by 10x and reports the new title", () => {
    const plan = planForUser({ email: "member@example.com" }, 100);
    expect(plan).toMatchObject({ oldRep: 100, newRep: 1000, newTitle: "Keeper", willBeExempt: false, skipped: false });
  });

  it("flags Lord Obsidian as exempt with no title", () => {
    const plan = planForUser({ email: "lord.obsidian.oc@gmail.com" }, 320);
    expect(plan).toMatchObject({ oldRep: 320, newRep: 3200, newTitle: "(exempt — no title)", willBeExempt: true });
  });

  it("skips a user with no REP to scale", () => {
    const plan = planForUser({ email: "new@example.com" }, 0);
    expect(plan.skipped).toBe(true);
    expect(plan.newRep).toBe(0);
  });
});

describe("appendScaleMigrationRow — idempotent per user", () => {
  it("running it twice adds nothing the second time", async () => {
    const user = seedUser({ rep: 100 });
    const prisma = makeFakePrisma();

    const first = await appendScaleMigrationRow(prisma, user, 100);
    expect(first).toEqual({ outcome: "applied", delta: 900 });
    expect(state.users.get("u1")?.rep).toBe(1000);
    expect(state.repHistory).toHaveLength(1);

    const second = await appendScaleMigrationRow(prisma, user, 100);
    expect(second).toEqual({ outcome: "duplicate", delta: 0 });
    expect(state.users.get("u1")?.rep).toBe(1000); // unchanged — not scaled twice
    expect(state.repHistory).toHaveLength(1); // no second row
  });

  it("sets repExempt for Lord Obsidian only", async () => {
    const lord = seedUser({ id: "u2", email: "lord.obsidian.oc@gmail.com", rep: 320 });
    const prisma = makeFakePrisma();

    await appendScaleMigrationRow(prisma, lord, 320);
    expect(state.users.get("u2")?.repExempt).toBe(true);
    expect(state.users.get("u2")?.rep).toBe(3200);
  });

  it("skips a user with zero current REP without writing a zero-delta row", async () => {
    const user = seedUser({ rep: 0 });
    const prisma = makeFakePrisma();
    const result = await appendScaleMigrationRow(prisma, user, 0);
    expect(result).toEqual({ outcome: "skipped-zero", delta: 0 });
    expect(state.repHistory).toHaveLength(0);
  });
});

describe("recomputeUserLocal — respects repExempt", () => {
  it("rebuilds titleLevel/councilEligible from the ledger for a normal user", async () => {
    const user = seedUser({ rep: 100, titleLevel: 1 });
    // A pre-existing ledger row for the 100 the user already had — the
    // fake, like the real DB, treats `user.rep` as a cache of this sum,
    // so a realistic starting state needs both in sync before migrating.
    state.repHistory.push({ id: "rh_pre", userId: "u1", delta: 100, category: "ACTIVITY", sourceType: "x", sourceId: "x", reasonCode: "x" });
    const prisma = makeFakePrisma();
    await appendScaleMigrationRow(prisma, user, 100); // +900, rep now 1000
    const recomputed = await recomputeUserLocal(prisma, "u1");
    expect(recomputed).toEqual({ rep: 1000, titleLevel: 2, councilEligible: false }); // 100 (pre-existing) + 900 (scale row)
  });

  it("rebuilds rep but freezes titleLevel/councilEligible for an exempt user", async () => {
    const lord = seedUser({ id: "u2", email: "lord.obsidian.oc@gmail.com", rep: 0, titleLevel: 1, repExempt: true });
    const prisma = makeFakePrisma();
    state.repHistory.push({ id: "rh_seed", userId: "u2", delta: 50000, category: "ADJUSTMENT", sourceType: "x", sourceId: "x", reasonCode: "x" });
    const recomputed = await recomputeUserLocal(prisma, "u2");
    expect(recomputed.rep).toBe(50000); // rep still rebuilt from the ledger
    expect(recomputed.titleLevel).toBe(1); // ...but title/council stay frozen
    expect(lord.councilEligible).toBe(false);
  });
});

describe("full run-twice simulation (append + recompute, as main() does)", () => {
  it("ends at exactly 10x the original after being run twice in a row", async () => {
    const user = seedUser({ rep: 580 });
    // The pre-existing ledger backing that 580, same as any real member's
    // history — recomputeUserLocal rebuilds from the ledger, not the
    // cached field, so the fake needs this to behave like production.
    state.repHistory.push({ id: "rh_pre", userId: "u1", delta: 580, category: "ACTIVITY", sourceType: "x", sourceId: "x", reasonCode: "x" });
    const prisma = makeFakePrisma();

    for (let run = 0; run < 2; run++) {
      await appendScaleMigrationRow(prisma, user, 580);
      await recomputeUserLocal(prisma, "u1");
    }

    expect(state.users.get("u1")?.rep).toBe(5800); // 580 * 10, not 580 * 19
    expect(state.repHistory).toHaveLength(2); // the pre-existing row + exactly one scale_migration row, not two
  });
});
