import { describe, expect, it } from "vitest";
import { getApproxLocation } from "./geo";

describe("getApproxLocation", () => {
  it("country + region present: 'Region, Country'", () => {
    const headers = new Headers({ "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "FL" });
    expect(getApproxLocation(headers)).toBe("FL, US");
  });

  it("country only: just the country", () => {
    const headers = new Headers({ "x-vercel-ip-country": "UA" });
    expect(getApproxLocation(headers)).toBe("UA");
  });

  it("neither header present (local dev, non-Vercel host): Unknown location", () => {
    expect(getApproxLocation(new Headers())).toBe("Unknown location");
  });

  it("region present without country (shouldn't happen, but don't fabricate a country): Unknown location", () => {
    const headers = new Headers({ "x-vercel-ip-country-region": "FL" });
    expect(getApproxLocation(headers)).toBe("Unknown location");
  });
});
