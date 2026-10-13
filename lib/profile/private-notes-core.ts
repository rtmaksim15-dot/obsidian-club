// Profile lite, B4 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// Pure — no "server-only", no Prisma.
export const MAX_NOTE_LENGTH = 500;

export type NoteValidation = { ok: true } | { ok: false; error: string };

export function validateNoteBody(body: string): NoteValidation {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Note can't be empty." };
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` };
  }
  return { ok: true };
}
