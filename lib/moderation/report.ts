import type { ReportCategory } from "@prisma/client";

// Member protection mechanics (pre-launch legal package, 2026-08-09).
// The first three categories are "red line" — they raise priority and,
// on review, trigger preservation instead of deletion (see
// Post.isPreserved, app/admin/reports). Order here is also display
// order in the report picker.
export const REPORT_CATEGORIES: { value: ReportCategory; label: string; isRedLine: boolean }[] = [
  { value: "underage", label: "Underage", isRedLine: true },
  { value: "non_consensual", label: "Non-consensual", isRedLine: true },
  { value: "threat", label: "Threat", isRedLine: true },
  { value: "doxxing", label: "Doxxing", isRedLine: false },
  { value: "commercial_solicitation", label: "Commercial solicitation", isRedLine: false },
  { value: "other", label: "Other", isRedLine: false },
];

export function isRedLineCategory(category: ReportCategory): boolean {
  return REPORT_CATEGORIES.find((c) => c.value === category)?.isRedLine ?? false;
}
