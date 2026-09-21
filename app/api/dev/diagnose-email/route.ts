import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { sendReportAlert } from "@/lib/utils/email";

// TEMPORARY — root-causing why sendReportAlert() isn't landing in the
// inbox despite a 201 response and no thrown error (2026-09-21 QA).
// Deleted immediately after diagnosis; never a permanent route.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 403 });
  }

  const hasKey = Boolean(process.env.RESEND_API_KEY);
  const keyPrefix = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.slice(0, 6) : null;

  const result = await sendReportAlert({
    reportId: "diagnostic-00000000-0000-0000-0000-000000000000",
    targetType: "post",
    categoryLabel: "Other",
    isUnderage: false,
  });

  return NextResponse.json({ hasKey, keyPrefix, appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null, result });
}
