import { describe, expect, it, vi } from "vitest";

// Hide Practices (founder decision, 2026-10-22, see DECISIONS.md) —
// GET/PATCH /api/profile/practices must 404 while PRACTICES_UI_ENABLED
// is false, before even checking authentication (a 404, not a 403 — a
// disabled feature's route shouldn't distinguish signed-in from
// anonymous callers any more than a route that was never built would).
vi.mock("server-only", () => ({}));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: getCurrentUserMock }));

vi.mock("@/lib/profile/practices", () => ({
  getActivePracticeTags: vi.fn(),
  getUserPractices: vi.fn(),
  setUserPractice: vi.fn(),
  getPracticesVisibility: vi.fn(),
  setPracticesVisibility: vi.fn(),
  PRACTICES_VISIBILITY_VALUES: ["everyone", "members", "nobody"],
}));

describe("GET/PATCH /api/profile/practices — gated by PRACTICES_UI_ENABLED", () => {
  it("flag off: GET returns 404 without checking auth", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PRACTICES_UI_ENABLED: false }));
    const { GET } = await import("./route");

    const res = await GET();

    expect(res.status).toBe(404);
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it("flag off: PATCH returns 404 without checking auth or parsing the body", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PRACTICES_UI_ENABLED: false }));
    const { PATCH } = await import("./route");

    const res = await PATCH(new Request("http://localhost/api/profile/practices", { method: "PATCH" }));

    expect(res.status).toBe(404);
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it("flag on: GET proceeds past the guard to the normal auth check (403, not 404)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/config/feature-flags", () => ({ PRACTICES_UI_ENABLED: true }));
    getCurrentUserMock.mockResolvedValueOnce(null);
    const { GET } = await import("./route");

    const res = await GET();

    expect(res.status).toBe(403);
    expect(getCurrentUserMock).toHaveBeenCalledTimes(1);
  });
});
