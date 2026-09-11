import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

type Body = { body?: string };

// POST /api/admin/members/:id/notes — Admin Console Zone 2, Notes
// (2026-09-11, see DECISIONS.md). Append-only: no PATCH/DELETE, same as
// RepHistory/LegalConsent/ModerationAction have no edit path either.
// admin_notes has no RLS policy (deny-all) -- this route, running
// server-side via Prisma, is the only way any of these rows are ever
// read or written.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const text = body.body?.trim();
  if (!text) {
    return NextResponse.json({ error: "Note text is required." }, { status: 422 });
  }

  const member = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const note = await prisma.adminNote.create({
    data: { memberId: member.id, authorId: admin.id, body: text },
  });

  return NextResponse.json({ ok: true, note: { id: note.id, body: note.body, createdAt: note.createdAt, authorName: admin.displayName } });
}
