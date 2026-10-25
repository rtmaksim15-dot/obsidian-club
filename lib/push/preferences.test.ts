import { describe, expect, it, vi, beforeEach } from "vitest";

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — read-merge-
// write on UserProfile.settings (CLAUDE.md rule 9, the 07.08.2026
// ritualProgress incident): setNotificationPreferences() must never
// clobber a sibling settings key (veil, boundaries, newcomerPath, ...)
// that happens to live on the same JSON column.
vi.mock("server-only", () => ({}));

const prismaMock = {
  userProfile: { findUnique: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
};
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getNotificationPreferences", () => {
  it("returns the documented defaults when no profile/settings exist yet", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);
    const { getNotificationPreferences } = await import("./preferences");

    expect(await getNotificationPreferences("user-1")).toEqual({
      discreet: true,
      messages: true,
      replies: true,
      lordWord: true,
    });
  });

  it("merges stored values over the defaults, for a partial object", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({ settings: { notifications: { replies: false } } });
    const { getNotificationPreferences } = await import("./preferences");

    expect(await getNotificationPreferences("user-1")).toEqual({
      discreet: true,
      messages: true,
      replies: false,
      lordWord: true,
    });
  });
});

describe("setNotificationPreferences — read-merge-write", () => {
  it("never clobbers a sibling settings key on the same JSON column", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      settings: { veil: true, boundaries: { whoCanMessage: "members" } },
    });
    const { setNotificationPreferences } = await import("./preferences");

    await setNotificationPreferences("user-1", { discreet: false });

    const upsertCall = prismaMock.userProfile.upsert.mock.calls[0][0];
    expect(upsertCall.update.settings.veil).toBe(true);
    expect(upsertCall.update.settings.boundaries).toEqual({ whoCanMessage: "members" });
    expect(upsertCall.update.settings.notifications).toEqual({
      discreet: false,
      messages: true,
      replies: true,
      lordWord: true,
    });
  });

  it("a partial patch merges onto existing notification prefs, not onto the bare defaults", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue({
      settings: { notifications: { discreet: false, messages: false, replies: false, lordWord: false } },
    });
    const { setNotificationPreferences } = await import("./preferences");

    const result = await setNotificationPreferences("user-1", { replies: true });

    expect(result).toEqual({ discreet: false, messages: false, replies: true, lordWord: false });
  });

  it("creates a fresh profile row when none exists yet", async () => {
    prismaMock.userProfile.findUnique.mockResolvedValue(null);
    const { setNotificationPreferences } = await import("./preferences");

    await setNotificationPreferences("user-1", { messages: false });

    const upsertCall = prismaMock.userProfile.upsert.mock.calls[0][0];
    expect(upsertCall.create.userId).toBe("user-1");
    expect(upsertCall.create.settings.notifications).toEqual({
      discreet: true,
      messages: false,
      replies: true,
      lordWord: true,
    });
  });
});
