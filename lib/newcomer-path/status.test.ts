import { describe, expect, it, vi } from "vitest";

// Hide Newcomer Path (founder decision, 2026-10-22, see DECISIONS.md)
// — the one real behavioral requirement: no NEWCOMER_* REP awarded
// while the flag is off. syncNewcomerPath() now returns null before
// touching the database at all when disabled, so this test asserts
// not just the return value but that nothing underneath it ever runs
// — zero Prisma calls, zero awardRep calls — rather than trusting the
// early return alone.
vi.mock("server-only", () => ({}));

const prismaMock = {
  user: { findUniqueOrThrow: vi.fn() },
  userProfile: { findUnique: vi.fn(), upsert: vi.fn() },
  userPractice: { count: vi.fn() },
  post: { count: vi.fn() },
};
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const awardRepMock = vi.fn();
vi.mock("@/lib/rep/ledger", () => ({ awardRep: awardRepMock }));

describe("syncNewcomerPath — gated by NEWCOMER_PATH_ENABLED", () => {
  it("flag off: returns null and never touches Prisma or the REP ledger", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ NEWCOMER_PATH_ENABLED: false }));
    const { syncNewcomerPath } = await import("./status");

    const result = await syncNewcomerPath("user-1");

    expect(result).toBeNull();
    expect(prismaMock.user.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prismaMock.userProfile.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.userProfile.upsert).not.toHaveBeenCalled();
    expect(awardRepMock).not.toHaveBeenCalled();
  });

  it("flag on: proceeds past the guard (reaches the database) instead of short-circuiting", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ NEWCOMER_PATH_ENABLED: true }));
    prismaMock.user.findUniqueOrThrow.mockRejectedValueOnce(new Error("stop here — guard passed correctly"));
    const { syncNewcomerPath } = await import("./status");

    await expect(syncNewcomerPath("user-1")).rejects.toThrow("stop here — guard passed correctly");
    expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-1" } }),
    );
  });
});
