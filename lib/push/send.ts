import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db/prisma";
import { PUSH_ENABLED } from "@/lib/config/feature-flags";
import { getNotificationPreferences } from "./preferences";
import { isBlockedEitherWay } from "@/lib/moderation/block";
import { checkRateLimit, type RateLimitResult } from "@/lib/security/rate-limit";
import { buildPushPayload, CATEGORY_PREFERENCE_KEY, type PushCategory } from "./payload";
import { isEligibleForPush, shouldSendPush } from "./policy";
import { PUSH_LORD_WORD_THROTTLE } from "./throttle";
import { errCode } from "@/lib/utils/safe-error";

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — the one place
// every trigger (new DM message, new conversation request, new comment
// on own post, admin Word of the Lord) calls through. See
// lib/push/policy.ts for the eligibility rule and lib/push/payload.ts
// for the discreet/non-discreet copy — this file is purely
// orchestration: fetch what the policy needs, apply it, send, clean up
// a dead subscription on 404/410.

function getVapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.error("[push] VAPID keys not fully configured — send skipped.");
    return null;
  }
  return { publicKey, privateKey, subject };
}

// web-push's setVapidDetails() is a module-level call on the `webpush`
// singleton, not per-request — safe to do once per cold start (the
// three values never change without a redeploy) rather than on every
// single sendPush() call.
let vapidConfigured = false;
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  const config = getVapidConfig();
  if (!config) return false;
  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * The actual delivery step, shared by sendPush() (one recipient, its
 * own per-category throttle already checked by the caller) and
 * sendLordWordBroadcast() (many recipients, the broadcast's own single
 * 24h throttle already checked once by the caller, before the loop) —
 * builds the discreet/non-discreet payload for this one recipient and
 * pushes it to every device they're subscribed on, removing any dead
 * (404/410) subscription it finds along the way.
 */
async function deliverToUser(params: {
  userId: string;
  category: PushCategory;
  discreet: boolean;
  senderDisplayName?: string | null;
  url: string;
}): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: params.userId } });
  if (subscriptions.length === 0) return;

  const payload = buildPushPayload({
    category: params.category,
    discreet: params.discreet,
    senderDisplayName: params.senderDisplayName,
    url: params.url,
  });
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
        await prisma.pushSubscription
          .update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } })
          .catch((err) => console.error("[push] Failed to touch lastUsedAt:", errCode(err)));
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | null)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // The push service itself says this endpoint is gone (the
          // member uninstalled, cleared site data, or revoked
          // permission from the OS) — remove the dead row rather than
          // retrying it on every future trigger.
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch((cleanupErr) => console.error("[push] Failed to clean up dead subscription:", errCode(cleanupErr)));
        } else {
          console.error("[push] sendNotification failed:", errCode(err));
        }
      }
    }),
  );
}

export type SendPushParams = {
  category: Exclude<PushCategory, "lord_word">;
  recipientId: string;
  actorId: string;
  actorIsAdmin: boolean;
  /** Used only in non-discreet mode (lib/push/payload.ts); never the message/comment text itself. */
  senderDisplayName?: string | null;
  /** Where tapping the notification should land. */
  url: string;
  /** Rate-limit key + window for "max 1 push per conversation per recipient per 10 min" (per-category, caller decides the exact key shape). */
  throttleKey: string;
  throttleOptions: { max: number; windowMs: number };
};

/**
 * Sends (or silently declines to send) a push for one recipient about
 * one of the three personal triggers. Never throws — every failure
 * mode (flag off, ineligible, no subscriptions, a dead endpoint, a
 * misconfigured VAPID key) is handled internally, since this is always
 * called from the middle of an otherwise-already-succeeded action (a
 * message was sent, a comment was posted) that must never fail because
 * a notification couldn't go out. For the admin broadcast, see
 * sendLordWordBroadcast() below instead.
 */
export async function sendPush(params: SendPushParams): Promise<void> {
  // Flag off: return before touching the database or web-push at all —
  // same shape as lib/newcomer-path/status.ts#syncNewcomerPath's own
  // guard (Package 5, Package N1's own precedent in this codebase).
  if (!PUSH_ENABLED) return;

  const isOwnAction = params.actorId === params.recipientId;

  // Cheap, side-effect-free lookups first — checked before the
  // throttle (which itself writes a row) so an ineligible call never
  // spends part of the recipient's throttle budget.
  const [recipient, isBlocked, preferences] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.recipientId }, select: { isTest: true } }),
    isOwnAction ? Promise.resolve(false) : isBlockedEitherWay(params.actorId, params.recipientId),
    getNotificationPreferences(params.recipientId),
  ]);
  if (!recipient) return;

  const categoryEnabled = preferences[CATEGORY_PREFERENCE_KEY[params.category]];

  const eligible = isEligibleForPush({
    pushEnabled: PUSH_ENABLED,
    isOwnAction,
    isBlocked,
    recipientIsTest: recipient.isTest,
    actorIsAdmin: params.actorIsAdmin,
    categoryEnabled,
  });
  if (!eligible) return;

  const rateLimit: RateLimitResult = await checkRateLimit(params.throttleKey, params.throttleOptions);
  const allowed = shouldSendPush({
    pushEnabled: PUSH_ENABLED,
    isOwnAction,
    isBlocked,
    recipientIsTest: recipient.isTest,
    actorIsAdmin: params.actorIsAdmin,
    categoryEnabled,
    throttleAllowed: rateLimit.allowed,
  });
  if (!allowed) return;

  await deliverToUser({
    userId: params.recipientId,
    category: params.category,
    discreet: preferences.discreet,
    senderDisplayName: params.senderDisplayName,
    url: params.url,
  });
}

export type LordWordBroadcastResult =
  | { ok: true; recipientCount: number }
  | { ok: false; reason: "disabled" | "throttled" };

/**
 * Admin "Word of the Lord" broadcast — a single global 24h throttle
 * (checked once here, NOT per recipient — this is what actually stops
 * a second broadcast within the window; sendPush()'s own per-recipient
 * throttle would be the wrong tool here, since a broadcast's first
 * recipient would consume the whole budget and silently block every
 * other recipient of the SAME broadcast). actorIsAdmin is always true
 * for this trigger — an admin is the only one who can call it (the
 * API route itself is requireAdminApi()-gated) — so the is_test skip
 * in lib/push/policy.ts never excludes a test account from a
 * broadcast, consistent with that rule applying uniformly rather than
 * special-cased per trigger.
 */
export async function sendLordWordBroadcast(adminUserId: string): Promise<LordWordBroadcastResult> {
  if (!PUSH_ENABLED) return { ok: false, reason: "disabled" };

  const rateLimit = await checkRateLimit("push:lordword:broadcast", PUSH_LORD_WORD_THROTTLE);
  if (!rateLimit.allowed) return { ok: false, reason: "throttled" };

  const subscribedUserIds = await prisma.pushSubscription.findMany({
    distinct: ["userId"],
    select: { userId: true },
  });

  const recipients = await prisma.user.findMany({
    where: { id: { in: subscribedUserIds.map((s) => s.userId) } },
    select: { id: true, isTest: true },
  });

  let recipientCount = 0;
  await Promise.all(
    recipients.map(async (recipient) => {
      const isOwnAction = recipient.id === adminUserId;
      const [isBlocked, preferences] = await Promise.all([
        isOwnAction ? Promise.resolve(false) : isBlockedEitherWay(adminUserId, recipient.id),
        getNotificationPreferences(recipient.id),
      ]);

      const eligible = isEligibleForPush({
        pushEnabled: PUSH_ENABLED,
        isOwnAction,
        isBlocked,
        recipientIsTest: recipient.isTest,
        actorIsAdmin: true,
        categoryEnabled: preferences.lordWord,
      });
      if (!eligible) return;

      recipientCount += 1;
      await deliverToUser({
        userId: recipient.id,
        category: "lord_word",
        discreet: preferences.discreet,
        url: "/feed",
      });
    }),
  );

  return { ok: true, recipientCount };
}
