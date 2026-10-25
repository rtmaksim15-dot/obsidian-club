import { describe, expect, it, vi, beforeEach } from "vitest";

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — the
// integration-shaped tests item 8 asks for: flag off = no sends at
// all (not even a Prisma lookup); the per-recipient throttle actually
// blocks a send; a 404/410 from the push service deletes the dead
// subscription row. The "discreet payload contains no names/text" and
// "preference gating" requirements are covered more thoroughly as
// pure unit tests in payload.test.ts/policy.test.ts — this file
// exercises the orchestration wiring those pure pieces into real
// (mocked) Prisma/web-push calls.
vi.mock("server-only", () => ({}));

const sendNotificationMock = vi.fn();
const setVapidDetailsMock = vi.fn();
vi.mock("web-push", () => ({
  default: {
    sendNotification: sendNotificationMock,
    setVapidDetails: setVapidDetailsMock,
  },
}));

const prismaMock = {
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  pushSubscription: {
    findMany: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
};
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const isBlockedEitherWayMock = vi.fn();
vi.mock("@/lib/moderation/block", () => ({ isBlockedEitherWay: isBlockedEitherWayMock }));

const checkRateLimitMock = vi.fn();
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit: checkRateLimitMock }));

const getNotificationPreferencesMock = vi.fn();
vi.mock("@/lib/push/preferences", () => ({ getNotificationPreferences: getNotificationPreferencesMock }));

const ALL_ON_DISCREET = { discreet: true, messages: true, replies: true, lordWord: true };

function setVapidEnv() {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
  process.env.VAPID_PRIVATE_KEY = "test-private-key";
  process.env.VAPID_SUBJECT = "mailto:support@obsidianclub.online";
}

const baseParams = {
  category: "message" as const,
  recipientId: "recipient-1",
  actorId: "actor-1",
  actorIsAdmin: false,
  senderDisplayName: "Max",
  url: "/messages/thread-1",
  throttleKey: "push:dm:thread-1:recipient-1",
  throttleOptions: { max: 1, windowMs: 10 * 60 * 1000 },
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
  prismaMock.user.findUnique.mockResolvedValue({ isTest: false });
  prismaMock.user.findMany.mockResolvedValue([]);
  isBlockedEitherWayMock.mockResolvedValue(false);
  getNotificationPreferencesMock.mockResolvedValue(ALL_ON_DISCREET);
  checkRateLimitMock.mockResolvedValue({ allowed: true });
  prismaMock.pushSubscription.findMany.mockResolvedValue([]);
});

describe("sendPush — flag off", () => {
  it("returns without any Prisma lookup, throttle check, or web-push call", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: false }));
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});

describe("sendPush — flag on", () => {
  it("never notifies the author about their own action, and never checks the throttle for it", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    const { sendPush } = await import("./send");

    await sendPush({ ...baseParams, actorId: "recipient-1" }); // actor === recipient

    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("respects a block: never checks the throttle, never sends", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    isBlockedEitherWayMock.mockResolvedValue(true);
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("respects the recipient's own category preference (messages off): never checks the throttle", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    getNotificationPreferencesMock.mockResolvedValue({ ...ALL_ON_DISCREET, messages: false });
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("throttle denies: never calls web-push", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    checkRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 600 });
    prismaMock.pushSubscription.findMany.mockResolvedValue([{ id: "sub-1", endpoint: "https://push.example/1", p256dh: "p", auth: "a" }]);
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(checkRateLimitMock).toHaveBeenCalledWith(baseParams.throttleKey, baseParams.throttleOptions);
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("missing VAPID config: eligible and throttle-allowed, but never calls web-push (fails closed, not throws)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    prismaMock.pushSubscription.findMany.mockResolvedValue([{ id: "sub-1", endpoint: "https://push.example/1", p256dh: "p", auth: "a" }]);
    const { sendPush } = await import("./send");

    await expect(sendPush(baseParams)).resolves.toBeUndefined();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("happy path: sends to every subscription and refreshes lastUsedAt on success", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    setVapidEnv();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { id: "sub-1", endpoint: "https://push.example/1", p256dh: "p1", auth: "a1" },
      { id: "sub-2", endpoint: "https://push.example/2", p256dh: "p2", auth: "a2" },
    ]);
    sendNotificationMock.mockResolvedValue(undefined);
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.pushSubscription.update).toHaveBeenCalledTimes(2);
    expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it("discreet payload sent over the wire never contains the sender's name", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    setVapidEnv();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { id: "sub-1", endpoint: "https://push.example/1", p256dh: "p1", auth: "a1" },
    ]);
    sendNotificationMock.mockResolvedValue(undefined);
    const { sendPush } = await import("./send");

    await sendPush(baseParams); // preferences default to discreet: true

    const [, body] = sendNotificationMock.mock.calls[0];
    expect(body).not.toContain("Max");
    expect(JSON.parse(body)).toEqual({ title: "Obsidian Club", body: "You have a new message.", url: baseParams.url });
  });

  it("404/410 from the push service deletes the dead subscription row, without affecting a healthy one", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    setVapidEnv();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { id: "dead-410", endpoint: "https://push.example/dead", p256dh: "p1", auth: "a1" },
      { id: "healthy", endpoint: "https://push.example/healthy", p256dh: "p2", auth: "a2" },
    ]);
    sendNotificationMock.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.includes("dead")) {
        const err = new Error("Gone") as Error & { statusCode: number };
        err.statusCode = 410;
        throw err;
      }
      return undefined;
    });
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledTimes(1);
    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: "dead-410" } });
    expect(prismaMock.pushSubscription.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "healthy" } }),
    );
  });

  it("a non-404/410 failure logs but does not delete the subscription", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    setVapidEnv();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { id: "sub-1", endpoint: "https://push.example/1", p256dh: "p1", auth: "a1" },
    ]);
    sendNotificationMock.mockRejectedValue(Object.assign(new Error("Service unavailable"), { statusCode: 503 }));
    const { sendPush } = await import("./send");

    await sendPush(baseParams);

    expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled();
  });
});

describe("sendLordWordBroadcast", () => {
  it("flag off: returns disabled without checking the throttle", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: false }));
    const { sendLordWordBroadcast } = await import("./send");

    const result = await sendLordWordBroadcast("admin-1");

    expect(result).toEqual({ ok: false, reason: "disabled" });
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("global 24h throttle denies a second broadcast: never queries recipients", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    checkRateLimitMock.mockResolvedValue({ allowed: false, retryAfterSeconds: 3600 });
    const { sendLordWordBroadcast } = await import("./send");

    const result = await sendLordWordBroadcast("admin-1");

    expect(result).toEqual({ ok: false, reason: "throttled" });
    expect(prismaMock.pushSubscription.findMany).not.toHaveBeenCalled();
  });

  it("checks the throttle exactly once regardless of recipient count (not once per recipient)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    setVapidEnv();
    prismaMock.pushSubscription.findMany
      .mockResolvedValueOnce([{ userId: "member-1" }, { userId: "member-2" }]) // distinct userIds query
      .mockResolvedValue([]); // per-recipient subscription lookups inside deliverToUser
    prismaMock.user.findMany.mockResolvedValue([
      { id: "member-1", isTest: false },
      { id: "member-2", isTest: false },
    ]);

    const { sendLordWordBroadcast } = await import("./send");
    await sendLordWordBroadcast("admin-1");

    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
    expect(checkRateLimitMock).toHaveBeenCalledWith("push:lordword:broadcast", { max: 1, windowMs: 24 * 60 * 60 * 1000 });
  });
});
