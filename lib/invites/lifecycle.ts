import "server-only";
import crypto from "crypto";

// Batch generator v2 (2026-08-14) — the print-batch lifecycle: a hard
// 90-day cap from generation, and a 7-day client window armed on first
// scan of /join/[token] (see evaluateTokenLifecycle below). Values are
// spec'd in the reconciliation addendum, not arbitrary.
export const HARD_CAP_DAYS = 90;
export const DEFAULT_CLIENT_WINDOW_DAYS = 7;

// Reconciliation addendum (2026-08-14): print-batch CSV/QR export must
// encode this literal domain rather than `NEXT_PUBLIC_APP_URL` — that env
// var is possibly-unset in production (see TECH_DEBT.md) and these links
// go on physical cards that can't be reprinted if the env var changes.
export const JOIN_BASE_URL = "https://obsidianclub.online";

export function joinUrl(token: string): string {
  return `${JOIN_BASE_URL}/join/${token}`;
}

export function computeValidUntil(from: Date): Date {
  return new Date(from.getTime() + HARD_CAP_DAYS * 24 * 60 * 60 * 1000);
}

// The client window is capped by the hard cap too — a token generated
// 85 days ago and scanned today gets 5 days, not the full 7, since
// validUntil (a fixed point from generation) always wins if it's the
// sooner deadline.
export function computeClientExpiresAt(
  firstScannedAt: Date,
  clientWindowDays: number,
  validUntil: Date | null,
): Date {
  const windowEnd = new Date(firstScannedAt.getTime() + clientWindowDays * 24 * 60 * 60 * 1000);
  if (validUntil && validUntil.getTime() < windowEnd.getTime()) return validUntil;
  return windowEnd;
}

// Excludes O/0/I/1 — the four characters most likely to be misread on
// a printed card or misheard read aloud. crypto.randomInt (not
// Math.random) for the same reason every other token in this codebase
// uses the crypto module: uniqueness here is enforced by the DB unique
// constraint with a caller-side retry, but the value itself should
// still not be trivially predictable.
const SHORT_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function shortCodeSegment(length: number): string {
  return Array.from({ length }, () => SHORT_CODE_CHARSET[crypto.randomInt(SHORT_CODE_CHARSET.length)]).join("");
}

export function generateShortCode(): string {
  return `OBS-${shortCodeSegment(4)}-${shortCodeSegment(4)}`;
}

// Batch generator v2 (2026-08-14) — generates `count` short codes with no
// in-batch collisions. The charset gives 32^8 (~1.1e12) combinations, so a
// cross-batch collision is astronomically unlikely; the DB's unique
// constraint on shortCode is the backstop if one ever happens (the
// createMany insert would fail loudly rather than silently double-issue
// a code).
export function generateUniqueShortCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateShortCode());
  }
  return Array.from(codes);
}

export type InviteTokenLike = {
  redeemedAt: Date | null;
  revokedAt: Date | null;
  validUntil: Date | null;
  firstScannedAt: Date | null;
  clientExpiresAt: Date | null;
};

export type LifecycleReason = "revoked" | "used" | "expired_hard_cap" | "expired_client_window";

export type LifecycleResult = { ok: true } | { ok: false; reason: LifecycleReason };

// Shared by the GET page (arm-on-scan) and the POST route (redeem) so
// the two never drift on what counts as terminal. `validUntil`/
// `clientExpiresAt` are null-safe: a grandfathered pre-lifecycle token
// (see schema.prisma's InviteToken comment) has both null and simply
// never hits either expiry branch — exactly its pre-migration behavior.
export function evaluateTokenLifecycle(token: InviteTokenLike, now: Date = new Date()): LifecycleResult {
  if (token.revokedAt) return { ok: false, reason: "revoked" };
  if (token.redeemedAt) return { ok: false, reason: "used" };
  if (token.validUntil && now.getTime() > token.validUntil.getTime()) {
    return { ok: false, reason: "expired_hard_cap" };
  }
  if (token.firstScannedAt && token.clientExpiresAt && now.getTime() > token.clientExpiresAt.getTime()) {
    return { ok: false, reason: "expired_client_window" };
  }
  return { ok: true };
}

export function lifecycleMessage(reason: LifecycleReason): string {
  switch (reason) {
    case "revoked":
      return "This invite has been revoked.";
    case "used":
      return "This invite has already been used.";
    case "expired_hard_cap":
      return "This invite has expired.";
    case "expired_client_window":
      return "This invite has expired — the one-week window to use it has closed.";
  }
}
