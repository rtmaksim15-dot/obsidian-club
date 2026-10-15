import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./user-agent";

describe("parseUserAgent", () => {
  it("null user agent: both unknown", () => {
    expect(parseUserAgent(null)).toEqual({ browser: "Unknown browser", os: "Unknown OS" });
  });

  it("Chrome on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({ browser: "Chrome", os: "macOS" });
  });

  it("Safari on iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(ua)).toEqual({ browser: "Safari", os: "iOS" });
  });

  it("Firefox on Windows", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(parseUserAgent(ua)).toEqual({ browser: "Firefox", os: "Windows" });
  });

  it("Chrome on Android", () => {
    const ua = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({ browser: "Chrome", os: "Android" });
  });

  it("Edge on Windows (shares Chrome/Safari tokens, must still resolve to Edge)", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseUserAgent(ua)).toEqual({ browser: "Edge", os: "Windows" });
  });

  it("an unrecognized UA string: both unknown, never throws", () => {
    expect(parseUserAgent("SomeBot/1.0")).toEqual({ browser: "Unknown browser", os: "Unknown OS" });
  });
});
