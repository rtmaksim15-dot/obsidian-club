import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { Prisma } from "@prisma/client";

// GET /api/admin/applications?status=pending|approved|declined (default: pending)
export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const statusParam = new URL(request.url).searchParams.get("status") ?? "pending";
  const validStatuses = ["pending", "approved", "declined"] as const;
  if (!validStatuses.includes(statusParam as (typeof validStatuses)[number])) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 422 });
  }

  const applications = await prisma.waitlist.findMany({
    where: { status: statusParam as Prisma.WaitlistWhereInput["status"] },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ applications });
}
