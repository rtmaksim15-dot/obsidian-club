import { describe, expect, it, vi } from "vitest";

// Web Push, Package N1 (2026-10-25, see DECISIONS.md), item 8 — "flag
// off = no sends," the API-route half: every push route 404s before
// even checking auth while PUSH_ENABLED is false, same posture as the
// practices routes two packages ago (app/api/profile/practices/
// route.test.ts).
vi.mock("server-only", () => ({}));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

const requireAdminApiMock = vi.fn();
vi.mock("@/lib/auth/require-admin", () => ({ requireAdminApi: requireAdminApiMock }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { pushSubscription: { upsert: vi.fn(), deleteMany: vi.fn() } },
}));

vi.mock("@/lib/push/preferences", () => ({
  getNotificationPreferences: vi.fn(),
  setNotificationPreferences: vi.fn(),
}));

const sendLordWordBroadcastMock = vi.fn();
vi.mock("@/lib/push/send", () => ({ sendLordWordBroadcast: sendLordWordBroadcastMock }));

describe("push API routes — PUSH_ENABLED off", () => {
  it("POST /api/push/subscribe: 404 without checking auth", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: false }));
    const { POST } = await import("./subscribe/route");

    const res = await POST(new Request("http://localhost/api/push/subscribe", { method: "POST" }));

    expect(res.status).toBe(404);
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it("POST /api/push/unsubscribe: 404 without checking auth", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: false }));
    const { POST } = await import("./unsubscribe/route");

    const res = await POST(new Request("http://localhost/api/push/unsubscribe", { method: "POST" }));

    expect(res.status).toBe(404);
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it("GET/PATCH /api/push/preferences: 404 without checking auth", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: false }));
    const { GET, PATCH } = await import("./preferences/route");

    const getRes = await GET();
    const patchRes = await PATCH(new Request("http://localhost/api/push/preferences", { method: "PATCH" }));

    expect(getRes.status).toBe(404);
    expect(patchRes.status).toBe(404);
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it("POST /api/admin/push/lord-word: 404 without checking admin auth", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: false }));
    const { POST } = await import("../admin/push/lord-word/route");

    const res = await POST(new Request("http://localhost/api/admin/push/lord-word", { method: "POST" }));

    expect(res.status).toBe(404);
    expect(requireAdminApiMock).not.toHaveBeenCalled();
    expect(sendLordWordBroadcastMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/push/lord-word — PUSH_ENABLED on", () => {
  it("still calls requireAdminApi() and returns its response when not an admin (excluded from the generic admin-routes-guard enumeration precisely because of the flag-off case above — see that test file's own comment)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    const deniedResponse = Response.json({ error: "Admin access required." }, { status: 403 });
    requireAdminApiMock.mockResolvedValueOnce({ ok: false, response: deniedResponse });
    const { POST } = await import("../admin/push/lord-word/route");

    const res = await POST(
      new Request("http://localhost/api/admin/push/lord-word", {
        method: "POST",
        body: JSON.stringify({ text: "hello" }),
      }),
    );

    expect(requireAdminApiMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(403);
    expect(sendLordWordBroadcastMock).not.toHaveBeenCalled();
  });

  it("an admin caller reaches sendLordWordBroadcast()", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PUSH_ENABLED: true }));
    requireAdminApiMock.mockResolvedValueOnce({ ok: true, user: { id: "admin-1" } });
    sendLordWordBroadcastMock.mockResolvedValueOnce({ ok: true, recipientCount: 3 });
    const { POST } = await import("../admin/push/lord-word/route");

    const res = await POST(
      new Request("http://localhost/api/admin/push/lord-word", {
        method: "POST",
        body: JSON.stringify({ text: "The Circle gathers." }),
      }),
    );

    expect(sendLordWordBroadcastMock).toHaveBeenCalledWith("admin-1");
    expect(res.status).toBe(200);
  });
});
