import { describe, expect, it } from "vitest";
import { validateAboutText, containsContactInfo, MAX_ABOUT_LENGTH } from "./about-text";

describe("containsContactInfo — B6/B8 contact stripping", () => {
  it("flags URLs", () => {
    expect(containsContactInfo("find me at https://example.com")).toBe(true);
    expect(containsContactInfo("find me at www.example.com")).toBe(true);
    expect(containsContactInfo("reach me on example.com")).toBe(true);
  });

  it("flags emails", () => {
    expect(containsContactInfo("mail me at person@example.com")).toBe(true);
  });

  it("flags phone numbers", () => {
    expect(containsContactInfo("call +1 555 123 4567")).toBe(true);
    expect(containsContactInfo("5551234567")).toBe(true);
  });

  it("flags @handles and messenger keywords", () => {
    expect(containsContactInfo("hit me up @my_telegram")).toBe(true);
    expect(containsContactInfo("I'm on Telegram")).toBe(true);
    expect(containsContactInfo("add me on WhatsApp")).toBe(true);
  });

  it("leaves ordinary prose alone", () => {
    expect(containsContactInfo("Rope since 2019. Into protocol and service. Say hello.")).toBe(false);
    expect(containsContactInfo("I'm 30-something and love the outdoors.")).toBe(false);
  });
});

describe("validateAboutText", () => {
  it("accepts ordinary text within the limit", () => {
    expect(validateAboutText("A quiet introduction.")).toEqual({ ok: true });
  });

  it("accepts exactly the limit, rejects one over", () => {
    expect(validateAboutText("a".repeat(MAX_ABOUT_LENGTH))).toEqual({ ok: true });
    expect(validateAboutText("a".repeat(MAX_ABOUT_LENGTH + 1)).ok).toBe(false);
  });

  it("rejects contact info with the exact required message", () => {
    expect(validateAboutText("Reach me at person@example.com")).toEqual({
      ok: false,
      error: "Contacts and links are not shared here. Use messages.",
    });
  });
});
