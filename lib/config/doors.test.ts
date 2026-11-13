import { afterEach, describe, expect, it, vi } from "vitest";

// Launch date move, Dec 1 (2026-11-13, see DECISIONS.md) — doors.ts had
// no tests of its own before this task; the task's own item 8 asks for
// the before/at-or-after boundary and the DST-adjacent timezone edge
// (Nov 30 23:59 ET closed, Dec 1 00:00 ET open) explicitly, so this
// covers both using the new target date as the actual fixture, not a
// placeholder.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/preview-allowlist", () => ({ isPreviewId: vi.fn().mockReturnValue(false) }));
vi.mock("@/lib/config/app-open", () => ({ isAppOpen: vi.fn().mockReturnValue(false), getAppOpenedAt: vi.fn() }));

const ORIGINAL_DOORS_OPEN_DATE = process.env.DOORS_OPEN_DATE;
const NEW_TARGET = "2026-12-01T00:00:00-05:00"; // midnight ET, Dec 1 — EST by then (DST fell back Nov 1)

describe("getDoorsState", () => {
  afterEach(() => {
    vi.useRealTimers();
    if (ORIGINAL_DOORS_OPEN_DATE === undefined) delete process.env.DOORS_OPEN_DATE;
    else process.env.DOORS_OPEN_DATE = ORIGINAL_DOORS_OPEN_DATE;
  });

  it("unset: feature off entirely — not active, no date", async () => {
    delete process.env.DOORS_OPEN_DATE;
    const { getDoorsState } = await import("./doors");
    expect(getDoorsState()).toEqual({ active: false, date: null });
  });

  it("set but unparseable: fails CLOSED (active, no date) rather than open", async () => {
    process.env.DOORS_OPEN_DATE = "not-a-real-date";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getDoorsState } = await import("./doors");

    expect(getDoorsState()).toEqual({ active: true, date: null });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("before the target (Nov 30, 23:59:59 ET): active (closed)", async () => {
    process.env.DOORS_OPEN_DATE = NEW_TARGET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-30T23:59:59-05:00"));
    const { getDoorsState } = await import("./doors");

    const state = getDoorsState();
    expect(state.active).toBe(true);
    expect(state.date?.toISOString()).toBe(new Date(NEW_TARGET).toISOString());
  });

  it("exactly at the target (Dec 1, 00:00:00 ET): no longer active (open)", async () => {
    process.env.DOORS_OPEN_DATE = NEW_TARGET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T00:00:00-05:00"));
    const { getDoorsState } = await import("./doors");

    expect(getDoorsState().active).toBe(false);
  });

  it("well after the target: not active (open)", async () => {
    process.env.DOORS_OPEN_DATE = NEW_TARGET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-15T12:00:00-05:00"));
    const { getDoorsState } = await import("./doors");

    expect(getDoorsState().active).toBe(false);
  });

  it("one second after the target: not active (open) — the boundary is strictly '<', not '<='", async () => {
    process.env.DOORS_OPEN_DATE = NEW_TARGET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-01T00:00:01-05:00"));
    const { getDoorsState } = await import("./doors");

    expect(getDoorsState().active).toBe(false);
  });

  it("one second before the target: active (closed)", async () => {
    process.env.DOORS_OPEN_DATE = NEW_TARGET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-30T23:59:59-05:00"));
    const { getDoorsState } = await import("./doors");

    expect(getDoorsState().active).toBe(true);
  });
});

describe("formatDoorsDate", () => {
  it("renders the new target as 'December 1st' (no year, ceremonial tone)", async () => {
    const { formatDoorsDate } = await import("./doors");
    expect(formatDoorsDate(new Date(NEW_TARGET))).toBe("December 1st");
  });
});

describe("bypassesDoors", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("an admin always bypasses, regardless of APP_OPEN/preview status", async () => {
    const { bypassesDoors } = await import("./doors");
    expect(bypassesDoors({ id: "u1", isAdmin: true })).toBe(true);
  });

  it("a non-admin, non-preview member does not bypass while APP_OPEN is false", async () => {
    const { bypassesDoors } = await import("./doors");
    expect(bypassesDoors({ id: "u1", isAdmin: false })).toBe(false);
  });

  it("isAppOpen()=true bypasses doors for every signed-in member, admin or not", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/app-open", () => ({ isAppOpen: () => true, getAppOpenedAt: vi.fn() }));
    vi.doMock("@/lib/auth/preview-allowlist", () => ({ isPreviewId: () => false }));
    const { bypassesDoors } = await import("./doors");
    expect(bypassesDoors({ id: "u1", isAdmin: false })).toBe(true);
  });
});
