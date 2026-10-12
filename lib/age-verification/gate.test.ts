import { beforeEach, describe, expect, it, vi } from "vitest";

// gate.ts imports AGE_VERIFICATION_ENABLED from ./index (lib/age-
// verification/index.ts), which itself pulls in prisma/track/
// moderation-log/the two providers — a lot to mock just to flip one
// boolean. Replacing that whole module instead of its transitive
// dependencies is simpler and just as real a test of gate.ts's own
// logic, which is all this file is about. AGE_VERIFICATION_ENABLED is
// a module-level const, frozen at import time, so each "enabled"/
// "disabled" scenario needs vi.resetModules() + a fresh vi.doMock +
// dynamic import to get a clean re-evaluation.
vi.mock("server-only", () => ({}));

describe("gate.ts — needsAgeVerification / requireAgeVerifiedApi", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function loadGate(enabled: boolean) {
    vi.doMock("@/lib/age-verification/index", () => ({ AGE_VERIFICATION_ENABLED: enabled }));
    return import("./gate");
  }

  it("enabled + unverified, non-admin member -> needs verification (member routes redirect/403)", async () => {
    const { needsAgeVerification, requireAgeVerifiedApi } = await loadGate(true);
    const user = { isAdmin: false, ageVerified: false };
    expect(needsAgeVerification(user)).toBe(true);
    const blocked = requireAgeVerifiedApi(user);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(403);
  });

  it("enabled + admin, unverified -> allowed (admin bypass, the 'founder exception')", async () => {
    const { needsAgeVerification, requireAgeVerifiedApi } = await loadGate(true);
    const user = { isAdmin: true, ageVerified: false };
    expect(needsAgeVerification(user)).toBe(false);
    expect(requireAgeVerifiedApi(user)).toBeNull();
  });

  it("enabled + already verified, non-admin -> allowed (verified user passes)", async () => {
    const { needsAgeVerification, requireAgeVerifiedApi } = await loadGate(true);
    const user = { isAdmin: false, ageVerified: true };
    expect(needsAgeVerification(user)).toBe(false);
    expect(requireAgeVerifiedApi(user)).toBeNull();
  });

  it("disabled entirely -> nobody is gated, even an unverified non-admin (allowed paths/feature stays open)", async () => {
    const { needsAgeVerification, requireAgeVerifiedApi } = await loadGate(false);
    const user = { isAdmin: false, ageVerified: false };
    expect(needsAgeVerification(user)).toBe(false);
    expect(requireAgeVerifiedApi(user)).toBeNull();
  });
});
