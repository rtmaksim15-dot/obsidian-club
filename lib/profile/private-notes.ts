import "server-only";
import { prisma } from "@/lib/db/prisma";
import { validateNoteBody } from "./private-notes-core";

export { validateNoteBody };

// Profile lite, B4 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// `authorId` always comes from the session in the API route, never
// from client input — that's the real author-only boundary (RLS on
// private_notes is deny-all; see the migration's header comment).

export async function getPrivateNote(authorId: string, subjectId: string): Promise<string | null> {
  const note = await prisma.privateNote.findUnique({
    where: { authorId_subjectId: { authorId, subjectId } },
    select: { body: true },
  });
  return note?.body ?? null;
}

export async function setPrivateNote(authorId: string, subjectId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  await prisma.privateNote.upsert({
    where: { authorId_subjectId: { authorId, subjectId } },
    create: { authorId, subjectId, body: trimmed },
    update: { body: trimmed },
  });
}

export async function deletePrivateNote(authorId: string, subjectId: string): Promise<void> {
  await prisma.privateNote.deleteMany({ where: { authorId, subjectId } });
}
