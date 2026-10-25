import { describe, expect, it } from "vitest";
import { isIOSUserAgent, needsIOSInstallPrompt, urlBase64ToUint8Array } from "./client-support";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";

describe("isIOSUserAgent", () => {
  it("recognizes iPhone/iPad/iPod", () => {
    expect(isIOSUserAgent(IPHONE_UA)).toBe(true);
    expect(isIOSUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe(true);
  });

  it("does not flag Android or desktop", () => {
    expect(isIOSUserAgent(ANDROID_UA)).toBe(false);
    expect(isIOSUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(false);
  });
});

describe("needsIOSInstallPrompt", () => {
  it("iOS + not standalone: needs the install prompt", () => {
    expect(needsIOSInstallPrompt(IPHONE_UA, false)).toBe(true);
  });

  it("iOS + already standalone (installed): no prompt needed", () => {
    expect(needsIOSInstallPrompt(IPHONE_UA, true)).toBe(false);
  });

  it("non-iOS: never needs the prompt, standalone or not", () => {
    expect(needsIOSInstallPrompt(ANDROID_UA, false)).toBe(false);
    expect(needsIOSInstallPrompt(ANDROID_UA, true)).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("round-trips against a known value (btoa/atob URL-safe variant)", () => {
    const original = "Hello, Obsidian Club!";
    const base64Url = Buffer.from(original, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const bytes = urlBase64ToUint8Array(base64Url);
    expect(Buffer.from(bytes).toString("utf8")).toBe(original);
  });

  it("handles input needing padding (length not a multiple of 4)", () => {
    // "a" (1 char) base64-encodes to "YQ==" normally; URL-safe form with padding stripped is "YQ".
    const bytes = urlBase64ToUint8Array("YQ");
    expect(Buffer.from(bytes).toString("utf8")).toBe("a");
  });
});
