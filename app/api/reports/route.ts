import { NextResponse } from "next/server";
import type { ReportCategory, ReportTargetType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { REPORT_CATEGORIES, isRedLineCategory } from "@/lib/moderation/report";

const VALID_TARGET_TYPES: ReportTargetType[] = ["post", "profile"];
const VALID_CATEGORIES = REPORT_CATEGORIES.map((c) => c.value);

type Body = { targetType?: string; targetId?: string; category?: string; note?: string };

// POST /api/reports — one-step report, reachable from every post and
// every profile (member protection mechanics, pre-launch legal
// package, 2026-08-09). No approval workflow to file one; review
// happens afterward in /admin/reports.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const targetType = body.targetType as ReportTargetType;
  if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: "Invalid report target." }, { status: 422 });
  }
  const targetId = body.targetId?.trim();
  if (!targetId) {
    return NextResponse.json({ error: "Missing target." }, { status: 422 });
  }
  const category = body.category as ReportCategory;
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 422 });
  }

  // Confirm the target actually exists — a report against a
  // just-deleted post or a typo'd id shouldn't silently succeed.
  if (targetType === "post") {
    const post = await prisma.post.findUnique({ where: { id: targetId }, select: { id: true, authorId: true } });
    if (!post) {
      return NextResponse.json({ error: "That post no longer exists." }, { status: 404 });
    }
    if (post.authorId === user.id) {
      return NextResponse.json({ error: "You can't report your own post." }, { status: 422 });
    }
  } else {
    const profile = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!profile) {
      return NextResponse.json({ error: "That member no longer exists." }, { status: 404 });
    }
    if (profile.id === user.id) {
      return NextResponse.json({ error: "You can't report your own profile." }, { status: 422 });
    }
  }

  const report = await prisma.report.create({
    data: {
      targetType,
      targetId,
      reporterId: user.id,
      category,
      isRedLine: isRedLineCategory(category),
      note: body.note?.trim() || null,
    },
  });

  return NextResponse.json({ id: report.id }, { status: 201 });
}
