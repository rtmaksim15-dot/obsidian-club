import { prisma } from "@/lib/db/prisma";

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
    },
  });
}
