import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

type Body = { name?: string; description?: string; minRep?: number };

// POST /api/admin/vault-items — creates a real Vault item, gated by a
// REP threshold. Exists so Max can add real items once he defines them
// — no catalog is invented or seeded, see prisma/schema.prisma's
// VaultItem comment and ADR-0016.
export async function POST(request: Request) {
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

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 422 });

  const minRep = body.minRep ?? 0;
  if (!Number.isInteger(minRep) || minRep < 0) {
    return NextResponse.json({ error: "minRep must be a non-negative integer." }, { status: 422 });
  }

  const item = await prisma.vaultItem.create({
    data: { name, description: body.description?.trim() || null, minRep },
  });
  return NextResponse.json({ item }, { status: 201 });
}
