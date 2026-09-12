import "server-only";
import { evaluateTokenLifecycle } from "@/lib/invites/lifecycle";
import type { TokenRow } from "@/components/admin/AdminConsole";

export type InviteTokenForShaping = {
  id: string;
  source: string;
  status: string;
  createdAt: Date;
  validUntil: Date | null;
  firstScannedAt: Date | null;
  clientExpiresAt: Date | null;
  revokedAt: Date | null;
  redeemedAt: Date | null;
  redeemedById: string | null;
  inviterId: string | null;
  partnerOfId: string | null;
  sentToEmail: string | null;
  sentToName: string | null;
  emailSentAt: Date | null;
  emailSendError: string | null;
};

export const TOKEN_SELECT = {
  id: true,
  source: true,
  status: true,
  createdAt: true,
  validUntil: true,
  clientWindowDays: true,
  firstScannedAt: true,
  clientExpiresAt: true,
  revokedAt: true,
  redeemedAt: true,
  redeemedById: true,
  inviterId: true,
  partnerOfId: true,
  sentToEmail: true,
  sentToName: true,
  emailSentAt: true,
  emailSendError: true,
} as const;

/** Zone 4's list is sorted failed-sends-first, newest-first otherwise (Admin Console, 2026-09-11). Applied per fetched page, including each "load more" batch (pagination, 2026-09-12) — not a global guarantee across pages. */
export function sortTokensFailedFirst<T extends { sentToEmail: string | null; emailSentAt: Date | null; createdAt: Date }>(
  tokens: T[],
): T[] {
  return [...tokens].sort((a, b) => {
    const aFailed = Boolean(a.sentToEmail) && !a.emailSentAt;
    const bFailed = Boolean(b.sentToEmail) && !b.emailSentAt;
    if (aFailed !== bFailed) return aFailed ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/** Shapes one InviteToken row into Zone 4's client-facing TokenRow — shared by the admin page's initial load and the paginated /api/admin/invite-tokens route so bucketing and name resolution never drift between the two. */
export function shapeTokenRow(t: InviteTokenForShaping, nameById: Map<string, string>, now: Date): TokenRow {
  const lifecycle = evaluateTokenLifecycle(t, now);
  const bucket: TokenRow["bucket"] = t.redeemedAt
    ? "redeemed"
    : t.revokedAt
      ? "revoked"
      : !lifecycle.ok
        ? "expired"
        : "issued";
  return {
    id: t.id,
    source: t.source,
    status: t.status,
    bucket,
    createdAt: t.createdAt.toISOString(),
    validUntil: t.validUntil ? t.validUntil.toISOString() : null,
    revokedAt: t.revokedAt ? t.revokedAt.toISOString() : null,
    redeemedAt: t.redeemedAt ? t.redeemedAt.toISOString() : null,
    redeemedByName: t.redeemedById ? (nameById.get(t.redeemedById) ?? null) : null,
    inviterName: t.inviterId ? (nameById.get(t.inviterId) ?? null) : null,
    partnerOfName: t.partnerOfId ? (nameById.get(t.partnerOfId) ?? null) : null,
    sentToEmail: t.sentToEmail,
    sentToName: t.sentToName,
    emailSentAt: t.emailSentAt ? t.emailSentAt.toISOString() : null,
    emailSendError: t.emailSendError,
  };
}
