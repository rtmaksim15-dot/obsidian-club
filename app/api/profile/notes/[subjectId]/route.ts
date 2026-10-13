import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPrivateNote, setPrivateNote, deletePrivateNote, validateNoteBody } from "@/lib/profile/private-notes";

// GET /api/profile/notes/:subjectId — the caller's own private note
// about `subjectId` (Profile lite, B4, Package 4, Phase B, 2026-10-13,
// see DECISIONS.md). `authorId` is always the session user — nobody
// else's note about this subject is ever reachable through this route.
export async function GET(_request: Request, { params }: { params: { subjectId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  const body = await getPrivateNote(user.id, params.subjectId);
  return NextResponse.json({ body });
}

type Body = { body?: string };

export async function PUT(request: Request, { params }: { params: { subjectId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  if (params.subjectId === user.id) {
    return NextResponse.json({ error: "You can't leave a note about yourself." }, { status: 422 });
  }

  let reqBody: Body;
  try {
    reqBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = reqBody.body ?? "";
  const validation = validateNoteBody(text);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  await setPrivateNote(user.id, params.subjectId, text);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { subjectId: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }
  await deletePrivateNote(user.id, params.subjectId);
  return NextResponse.json({ ok: true });
}
