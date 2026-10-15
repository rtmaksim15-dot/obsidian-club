import { describe, expect, it } from "vitest";
import { classifySwipe } from "./gestures";

describe("classifySwipe", () => {
  const THRESHOLD = 60;

  it("a downward swipe past the threshold closes", () => {
    expect(classifySwipe(5, 80, THRESHOLD)).toBe("close");
  });

  it("an upward swipe past the threshold is not a close (only downward closes)", () => {
    expect(classifySwipe(5, -80, THRESHOLD)).toBe("none");
  });

  it("a leftward swipe past the threshold goes to the next image", () => {
    expect(classifySwipe(-80, 5, THRESHOLD)).toBe("next");
  });

  it("a rightward swipe past the threshold goes to the previous image", () => {
    expect(classifySwipe(80, 5, THRESHOLD)).toBe("prev");
  });

  it("a small movement under the threshold in any direction is not a swipe", () => {
    expect(classifySwipe(10, 10, THRESHOLD)).toBe("none");
    expect(classifySwipe(0, 0, THRESHOLD)).toBe("none");
  });

  it("exactly at the threshold does not trigger (strictly greater-than)", () => {
    expect(classifySwipe(THRESHOLD, 0, THRESHOLD)).toBe("none");
    expect(classifySwipe(0, THRESHOLD, THRESHOLD)).toBe("none");
  });

  it("a roughly-diagonal swipe (|dx| ~= |dy|) resolves to none rather than guessing", () => {
    expect(classifySwipe(70, 70, THRESHOLD)).toBe("none");
  });

  it("picks the dominant axis when one clearly exceeds the other", () => {
    expect(classifySwipe(90, 10, THRESHOLD)).toBe("prev");
    expect(classifySwipe(10, 90, THRESHOLD)).toBe("close");
  });
});
