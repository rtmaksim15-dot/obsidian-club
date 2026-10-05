import { prisma } from "@/lib/db/prisma";
import { maybeRunRetentionCleanup, requiresMandatoryRetention } from "./retention";

// General-purpose admin-action audit log (see prisma/schema.prisma's
// ModerationAction comment for why this is separate from RepHistory/
// AnalyticsEvent). "Who, when, what, which AUP section" — evidence of
// good-faith moderation for a future dispute, not analytics.
export async function logModerationAction(params: {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  aupSection?: string;
  note?: string;
}) {
  await prisma.moderationAction.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      aupSection: params.aupSection,
      note: params.note,
      // Security package 4, FIX 13 (2026-10-05, see DECISIONS.md) —
      // computed once, here, the single place every caller already
      // funnels through — no call site needs to know about this.
      preserveIndefinitely: requiresMandatoryRetention(params.aupSection),
    },
  });

  // Fire-and-forget, same as lib/security/rate-limit.ts#maybeCleanup —
  // this function is called on every admin moderation action across the
  // whole admin surface, frequent enough to drive the opportunistic
  // retention sweep without blocking this call's own response.
  void maybeRunRetentionCleanup();
}
