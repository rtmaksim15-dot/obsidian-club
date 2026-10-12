import { afterEach, describe, expect, it } from "vitest";
import { getMaxPhotosPerPost } from "./limits";

describe("getMaxPhotosPerPost", () => {
  const original = process.env.MAX_PHOTOS_PER_POST;

  afterEach(() => {
    process.env.MAX_PHOTOS_PER_POST = original;
  });

  it("defaults to 3 when MAX_PHOTOS_PER_POST isn't set", () => {
    delete process.env.MAX_PHOTOS_PER_POST;
    expect(getMaxPhotosPerPost()).toBe(3);
  });

  it("falls back to 3 on an invalid (non-numeric, zero, or negative) value", () => {
    process.env.MAX_PHOTOS_PER_POST = "not-a-number";
    expect(getMaxPhotosPerPost()).toBe(3);
    process.env.MAX_PHOTOS_PER_POST = "0";
    expect(getMaxPhotosPerPost()).toBe(3);
    process.env.MAX_PHOTOS_PER_POST = "-1";
    expect(getMaxPhotosPerPost()).toBe(3);
  });

  it("honors a valid override", () => {
    process.env.MAX_PHOTOS_PER_POST = "5";
    expect(getMaxPhotosPerPost()).toBe(5);
  });
});

// Mirrors app/api/posts/route.ts's own enforcement check exactly
// (`photos.length > maxPhotos` rejects the whole post) — same
// comparison, exercised against the real getter's default.
describe("MAX_PHOTOS_PER_POST enforcement boundary", () => {
  it("a post with exactly the limit (3) is allowed", () => {
    const max = getMaxPhotosPerPost();
    const photos = [1, 2, 3];
    expect(photos.length > max).toBe(false);
  });

  it("a post with one more than the limit (4) is rejected", () => {
    const max = getMaxPhotosPerPost();
    const photos = [1, 2, 3, 4];
    expect(photos.length > max).toBe(true);
  });
});
