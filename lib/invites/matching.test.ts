import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeOptionalField } from "./matching";

describe("normalizeEmail", () => {
  it("lowercases", () => {
    expect(normalizeEmail("Person@Example.COM")).toBe("person@example.com");
  });

  it("trims leading/trailing whitespace", () => {
    expect(normalizeEmail("  person@example.com  ")).toBe("person@example.com");
  });

  it("trims tabs and newlines too (not just spaces)", () => {
    expect(normalizeEmail("\tperson@example.com\n")).toBe("person@example.com");
  });

  it("combines case and whitespace normalization", () => {
    expect(normalizeEmail("  Person@Example.COM  ")).toBe("person@example.com");
  });

  it("two differently-cased/spaced inputs for the same address normalize identically", () => {
    expect(normalizeEmail(" Jane.Doe@Example.com")).toBe(normalizeEmail("jane.doe@EXAMPLE.COM "));
  });

  it("does not alter an already-normalized address", () => {
    expect(normalizeEmail("person@example.com")).toBe("person@example.com");
  });

  it("only trims outer whitespace, never internal characters", () => {
    expect(normalizeEmail("  person+tag@example.com  ")).toBe("person+tag@example.com");
  });
});

describe("normalizeOptionalField", () => {
  it("trims a real value", () => {
    expect(normalizeOptionalField("  Canada  ")).toBe("Canada");
  });

  it("empty string becomes null", () => {
    expect(normalizeOptionalField("")).toBeNull();
  });

  it("whitespace-only becomes null", () => {
    expect(normalizeOptionalField("   ")).toBeNull();
  });

  it("undefined becomes null", () => {
    expect(normalizeOptionalField(undefined)).toBeNull();
  });

  it("null stays null", () => {
    expect(normalizeOptionalField(null)).toBeNull();
  });
});
