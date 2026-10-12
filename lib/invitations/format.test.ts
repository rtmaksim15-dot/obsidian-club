import { describe, expect, it } from "vitest";
import { formatInvitationCount } from "./format";

describe("formatInvitationCount — MINE menu's invitations line (0 / 1 / N)", () => {
  it("0 -> 'No invitations remain.'", () => {
    expect(formatInvitationCount(0)).toBe("No invitations remain.");
  });

  it("1 -> singular 'invitation'", () => {
    expect(formatInvitationCount(1)).toBe("You hold 1 invitation.");
  });

  it("N (>1) -> plural 'invitations'", () => {
    expect(formatInvitationCount(3)).toBe("You hold 3 invitations.");
    expect(formatInvitationCount(12)).toBe("You hold 12 invitations.");
  });
});
