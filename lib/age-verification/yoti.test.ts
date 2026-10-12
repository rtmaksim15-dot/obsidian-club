import { afterEach, describe, expect, it, vi } from "vitest";

// Same stub as lib/rep/ledger.test.ts — "server-only" throws on a plain
// Node import outside Next's bundler condition.
vi.mock("server-only", () => ({}));

import { mapYotiStatus, yotiProvider, type YotiResultResponse } from "./yoti";

describe("mapYotiStatus — all 7 real Yoti statuses -> our internal enum", () => {
  it("PENDING -> pending", () => {
    expect(mapYotiStatus({ status: "PENDING" })).toBe("pending");
  });

  it("IN_PROGRESS -> pending (same bucket as PENDING)", () => {
    expect(mapYotiStatus({ status: "IN_PROGRESS" })).toBe("pending");
  });

  it("CANCELLED -> cancelled", () => {
    expect(mapYotiStatus({ status: "CANCELLED" })).toBe("cancelled");
  });

  it("EXPIRED -> expired", () => {
    expect(mapYotiStatus({ status: "EXPIRED" })).toBe("expired");
  });

  it("FAIL -> failed", () => {
    expect(mapYotiStatus({ status: "FAIL" })).toBe("failed");
  });

  it("ERROR -> failed", () => {
    expect(mapYotiStatus({ status: "ERROR" })).toBe("failed");
  });

  it("COMPLETE with a method explicitly allowed -> passed", () => {
    const result: YotiResultResponse = { status: "COMPLETE", method: "doc_scan", doc_scan: { allowed: true } };
    expect(mapYotiStatus(result)).toBe("passed");
  });

  it("COMPLETE with a method explicitly NOT allowed -> failed", () => {
    const result: YotiResultResponse = { status: "COMPLETE", method: "doc_scan", doc_scan: { allowed: false } };
    expect(mapYotiStatus(result)).toBe("failed");
  });

  it("COMPLETE with no readable allowed signal at all -> failed (fails closed, never defaults to passed)", () => {
    const result: YotiResultResponse = { status: "COMPLETE" };
    expect(mapYotiStatus(result)).toBe("failed");
  });
});

describe("yotiProvider.verifyWebhook — fails closed without a valid signature", () => {
  const originalSecret = process.env.YOTI_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.YOTI_WEBHOOK_SECRET = originalSecret;
  });

  it("rejects when YOTI_WEBHOOK_SECRET isn't configured at all", async () => {
    delete process.env.YOTI_WEBHOOK_SECRET;
    const request = new Request("https://example.com/webhook", { headers: { "x-yoti-webhook-secret": "anything" } });
    expect(await yotiProvider.verifyWebhook(request)).toBe(false);
  });

  it("rejects when the secret is configured but the request carries no header", async () => {
    process.env.YOTI_WEBHOOK_SECRET = "real-secret";
    const request = new Request("https://example.com/webhook");
    expect(await yotiProvider.verifyWebhook(request)).toBe(false);
  });

  it("rejects when the header is present but doesn't match", async () => {
    process.env.YOTI_WEBHOOK_SECRET = "real-secret";
    const request = new Request("https://example.com/webhook", {
      headers: { "x-yoti-webhook-secret": "wrong-secret" },
    });
    expect(await yotiProvider.verifyWebhook(request)).toBe(false);
  });

  it("accepts only when the header matches exactly (confirms the check isn't vacuously always-false)", async () => {
    process.env.YOTI_WEBHOOK_SECRET = "real-secret";
    const request = new Request("https://example.com/webhook", {
      headers: { "x-yoti-webhook-secret": "real-secret" },
    });
    expect(await yotiProvider.verifyWebhook(request)).toBe(true);
  });
});
