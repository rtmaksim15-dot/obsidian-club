import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  row: null as { status: string; method: string | null } | null,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    ageVerification: {
      findUnique: async () => state.row,
    },
  },
}));

import { mockProvider } from "./mock";

describe("mockProvider.createSession — local stand-in, no network call", () => {
  it("returns a mock_-prefixed sessionId and a matching /verify/mock/:id redirectUrl", async () => {
    const { sessionId, redirectUrl } = await mockProvider.createSession("any-user-id");
    expect(sessionId.startsWith("mock_")).toBe(true);
    expect(redirectUrl).toBe(`/verify/mock/${sessionId}`);
  });

  it("mints a fresh sessionId on every call", async () => {
    const a = await mockProvider.createSession("user-a");
    const b = await mockProvider.createSession("user-a");
    expect(a.sessionId).not.toBe(b.sessionId);
  });
});

describe("mockProvider.getResult", () => {
  it("returns pending when no AgeVerification row exists yet for this session", async () => {
    state.row = null;
    expect(await mockProvider.getResult("mock_unknown")).toEqual({ status: "pending" });
  });

  it("reflects whatever status/method the row was set to (by the mock simulate-pass/fail route)", async () => {
    state.row = { status: "passed", method: "mock" };
    expect(await mockProvider.getResult("mock_abc")).toEqual({ status: "passed", method: "mock" });
  });

  it("omits method when the row has none set", async () => {
    state.row = { status: "pending", method: null };
    expect(await mockProvider.getResult("mock_abc")).toEqual({ status: "pending", method: undefined });
  });
});

describe("mockProvider.verifyWebhook", () => {
  it("always returns false — the mock provider has no real webhook", async () => {
    expect(await mockProvider.verifyWebhook(new Request("https://example.com/webhook"))).toBe(false);
  });
});
