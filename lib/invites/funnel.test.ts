import { describe, expect, it } from "vitest";
import { classifyInviteRow, hasApplied } from "./funnel";

describe("classifyInviteRow", () => {
  it("active account wins even if the waitlist row is also approved", () => {
    expect(classifyInviteRow({ isActiveAccount: true, waitlistStatus: "approved" })).toBe("activeAccount");
  });

  it("active account wins even with no waitlist row at all (direct invite path)", () => {
    expect(classifyInviteRow({ isActiveAccount: true, waitlistStatus: null })).toBe("activeAccount");
  });

  it("approved, not yet registered", () => {
    expect(classifyInviteRow({ isActiveAccount: false, waitlistStatus: "approved" })).toBe("approved");
  });

  it("pending counts as pending approval", () => {
    expect(classifyInviteRow({ isActiveAccount: false, waitlistStatus: "pending" })).toBe("pendingApproval");
  });

  it("held counts as pending approval", () => {
    expect(classifyInviteRow({ isActiveAccount: false, waitlistStatus: "held" })).toBe("pendingApproval");
  });

  it("declined is applied, but neither pending nor approved", () => {
    expect(classifyInviteRow({ isActiveAccount: false, waitlistStatus: "declined" })).toBe("appliedOnly");
  });

  it("no waitlist row and no account: invited only", () => {
    expect(classifyInviteRow({ isActiveAccount: false, waitlistStatus: null })).toBe("invitedOnly");
  });
});

describe("hasApplied", () => {
  it("true for every bucket except invitedOnly", () => {
    expect(hasApplied("activeAccount")).toBe(true);
    expect(hasApplied("approved")).toBe(true);
    expect(hasApplied("pendingApproval")).toBe(true);
    expect(hasApplied("appliedOnly")).toBe(true);
  });

  it("false for invitedOnly", () => {
    expect(hasApplied("invitedOnly")).toBe(false);
  });
});
