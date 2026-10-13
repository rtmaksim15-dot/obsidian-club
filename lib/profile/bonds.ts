import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { BondKind } from "@prisma/client";
import { canAddActiveBond, describeBondForOwner, MAX_ACTIVE_BONDS } from "./bonds-core";

export { MAX_ACTIVE_BONDS };

export type BondError = { ok: false; status: number; error: string };
export type BondResult<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | BondError;

async function getActiveBondCount(userId: string): Promise<number> {
  return prisma.bond.count({
    where: { status: "active", OR: [{ fromUserId: userId }, { toUserId: userId }] },
  });
}

/**
 * B3: send a bond request. No existing pending/active bond between the
 * same two people, of any kind — one relationship at a time between a
 * given pair, not stacked (e.g. partner + dominant_of simultaneously),
 * matching the "confirmed relationships" framing (a single standing
 * fact about the pair), not a general-purpose tag system.
 */
export async function createBondRequest(fromUserId: string, toUserId: string, kind: BondKind): Promise<BondResult> {
  if (fromUserId === toUserId) {
    return { ok: false, status: 422, error: "You can't bond with yourself." };
  }

  const existing = await prisma.bond.findFirst({
    where: {
      OR: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, status: 409, error: "A bond already exists (or is pending) with this member." };
  }

  const activeCount = await getActiveBondCount(fromUserId);
  if (!canAddActiveBond(activeCount)) {
    return { ok: false, status: 403, error: `You already have ${MAX_ACTIVE_BONDS} active bonds.` };
  }

  await prisma.bond.create({ data: { fromUserId, toUserId, kind } });
  return { ok: true };
}

/** B3: accept — only the recipient (toUserId) may accept; re-checks both sides' cap at accept time, not just request time. */
export async function acceptBondRequest(bondId: string, actingUserId: string): Promise<BondResult> {
  const bond = await prisma.bond.findUnique({ where: { id: bondId } });
  if (!bond || bond.toUserId !== actingUserId) {
    return { ok: false, status: 404, error: "Bond request not found." };
  }
  if (bond.status !== "pending") {
    return { ok: false, status: 409, error: "This bond is no longer pending." };
  }

  const [fromCount, toCount] = await Promise.all([
    getActiveBondCount(bond.fromUserId),
    getActiveBondCount(bond.toUserId),
  ]);
  if (!canAddActiveBond(fromCount) || !canAddActiveBond(toCount)) {
    return { ok: false, status: 403, error: `One of you already has ${MAX_ACTIVE_BONDS} active bonds.` };
  }

  const updated = await prisma.bond.updateMany({
    where: { id: bondId, status: "pending" },
    data: { status: "active", respondedAt: new Date() },
  });
  if (updated.count === 0) {
    return { ok: false, status: 409, error: "This bond is no longer pending." };
  }
  return { ok: true };
}

/**
 * B3: dissolve — either side, instantly, no reason recorded. Also the
 * decline path for a still-pending request: BondStatus has only
 * pending/active (no separate declined/dissolved terminal state, per
 * the task's own schema spec), so both "decline a request" and
 * "dissolve an active bond" are the same operation here: delete the
 * row. See DECISIONS.md.
 */
export async function dissolveBond(bondId: string, actingUserId: string): Promise<BondResult> {
  const bond = await prisma.bond.findUnique({ where: { id: bondId }, select: { fromUserId: true, toUserId: true } });
  if (!bond || (bond.fromUserId !== actingUserId && bond.toUserId !== actingUserId)) {
    return { ok: false, status: 404, error: "Bond not found." };
  }
  await prisma.bond.delete({ where: { id: bondId } });
  return { ok: true };
}

export type DisplayBond = { id: string; description: string; otherUsername: string | null };

/** B5: active, visible bonds for a profile, already phrased from the owner's own side. */
export async function getVisibleBondsForProfile(ownerId: string): Promise<DisplayBond[]> {
  const rows = await prisma.bond.findMany({
    where: { status: "active", visible: true, OR: [{ fromUserId: ownerId }, { toUserId: ownerId }] },
    select: {
      id: true,
      kind: true,
      fromUserId: true,
      fromUser: { select: { username: true, displayName: true } },
      toUser: { select: { username: true, displayName: true } },
    },
  });

  return rows.map((row) => {
    const ownerIsFromUser = row.fromUserId === ownerId;
    const other = ownerIsFromUser ? row.toUser : row.fromUser;
    return {
      id: row.id,
      description: describeBondForOwner(row.kind, ownerIsFromUser, other.displayName),
      otherUsername: other.username,
    };
  });
}
