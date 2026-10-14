import { describe, expect, it } from "vitest";
import { canDeleteOwnMessage } from "./own-message-delete";

const ok = { isAuthor: true, isDeleted: false, preserveIndefinitely: false, hasOpenReport: false };

describe("canDeleteOwnMessage — Clean Hall, B3 follow-up", () => {
  it("own, not-yet-deleted, not preserved, no open report: allowed", () => {
    expect(canDeleteOwnMessage(ok)).toEqual({ ok: true });
  });

  it("someone else's message: denied", () => {
    expect(canDeleteOwnMessage({ ...ok, isAuthor: false })).toEqual({
      ok: false,
      status: 403,
      error: "You can only delete your own messages.",
    });
  });

  it("a preserved (red-line) message: denied, even for its own author", () => {
    expect(canDeleteOwnMessage({ ...ok, preserveIndefinitely: true })).toEqual({
      ok: false,
      status: 403,
      error: "This message can't be removed.",
    });
  });

  it("a message under an open report: denied", () => {
    expect(canDeleteOwnMessage({ ...ok, hasOpenReport: true })).toEqual({
      ok: false,
      status: 409,
      error: "This message is under review and can't be removed right now.",
    });
  });

  it("an already-deleted message: denied", () => {
    expect(canDeleteOwnMessage({ ...ok, isDeleted: true })).toEqual({
      ok: false,
      status: 409,
      error: "This message has already been removed.",
    });
  });
});
