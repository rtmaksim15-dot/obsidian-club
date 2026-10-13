import { describe, expect, it } from "vitest";
import { validateNoteBody, MAX_NOTE_LENGTH } from "./private-notes-core";

describe("validateNoteBody — B4/B8", () => {
  it("accepts an ordinary note", () => {
    expect(validateNoteBody("Met at the Newcomers room, very thoughtful.")).toEqual({ ok: true });
  });

  it("rejects an empty (or whitespace-only) note", () => {
    expect(validateNoteBody("")).toEqual({ ok: false, error: "Note can't be empty." });
    expect(validateNoteBody("   ")).toEqual({ ok: false, error: "Note can't be empty." });
  });

  it("accepts exactly the limit, rejects one over", () => {
    expect(validateNoteBody("a".repeat(MAX_NOTE_LENGTH))).toEqual({ ok: true });
    expect(validateNoteBody("a".repeat(MAX_NOTE_LENGTH + 1))).toEqual({
      ok: false,
      error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`,
    });
  });
});
