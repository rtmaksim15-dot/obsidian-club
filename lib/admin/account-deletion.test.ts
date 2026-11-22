import { describe, expect, it } from "vitest";
import { deletedAdminActorLabel, deletionConfirmationText } from "./account-deletion";

describe("deletionConfirmationText", () => {
  it("uses the username when the member has one", () => {
    expect(deletionConfirmationText({ username: "toma2", displayName: "Тома2" })).toBe("toma2");
  });

  it("falls back to displayName when username is null", () => {
    expect(deletionConfirmationText({ username: null, displayName: "Тома2" })).toBe("Тома2");
  });
});

describe("deletedAdminActorLabel", () => {
  it("prefixes with deleted-admin:", () => {
    expect(deletedAdminActorLabel("Max")).toBe("deleted-admin:Max");
  });
});
