import { describe, expect, it } from "vitest";
import { mergeBroughtIn, resolveBondsForPerson } from "./linked-accounts";

describe("mergeBroughtIn", () => {
  it("members come first, then applicants, each in input order", () => {
    const merged = mergeBroughtIn(
      [{ id: "m1", displayName: "Member One" }, { id: "m2", displayName: "Member Two" }],
      [{ id: "a1", displayName: "Applicant One", status: "pending" }],
    );
    expect(merged.map((e) => e.id)).toEqual(["m1", "m2", "a1"]);
  });

  it("tags members as registered and applicants with their own status", () => {
    const merged = mergeBroughtIn(
      [{ id: "m1", displayName: "Member One" }],
      [{ id: "a1", displayName: "Applicant One", status: "held" }],
    );
    expect(merged).toEqual([
      { id: "m1", type: "member", displayName: "Member One", status: "registered" },
      { id: "a1", type: "applicant", displayName: "Applicant One", status: "held" },
    ]);
  });

  it("returns an empty list when nobody was brought in", () => {
    expect(mergeBroughtIn([], [])).toEqual([]);
  });
});

describe("resolveBondsForPerson", () => {
  const bond = {
    id: "b1",
    kind: "partner",
    status: "active",
    fromUserId: "p1",
    toUserId: "p2",
    fromUserName: "Alice",
    toUserName: "Bob",
  };

  it("direction 'from' and otherName resolves to the other side, when viewed from fromUserId", () => {
    const [resolved] = resolveBondsForPerson("p1", [bond]);
    expect(resolved).toEqual({ id: "b1", kind: "partner", status: "active", otherId: "p2", otherName: "Bob", direction: "from" });
  });

  it("direction 'to' and otherName resolves to the other side, when viewed from toUserId", () => {
    const [resolved] = resolveBondsForPerson("p2", [bond]);
    expect(resolved).toEqual({ id: "b1", kind: "partner", status: "active", otherId: "p1", otherName: "Alice", direction: "to" });
  });

  it("returns an empty list for no bonds", () => {
    expect(resolveBondsForPerson("p1", [])).toEqual([]);
  });
});
