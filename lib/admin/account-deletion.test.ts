import { describe, expect, it } from "vitest";
import { deletedAdminActorLabel } from "./account-deletion";

describe("deletedAdminActorLabel", () => {
  it("prefixes with deleted-admin:", () => {
    expect(deletedAdminActorLabel("Max")).toBe("deleted-admin:Max");
  });
});
