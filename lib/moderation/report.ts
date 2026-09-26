import type { ReportCategory } from "@prisma/client";
import { MIN_MEMBER_AGE } from "@/lib/legal/eligibility";

// Member protection mechanics (pre-launch legal package, 2026-08-09).
// The first three categories are "red line" — they raise priority and,
// on review, trigger preservation instead of deletion (see
// Post.isPreserved, app/admin/reports). Order here is also display
// order in the report picker.
//
// `description` (dedicated report modal, item 6, 2026-09-20, see
// DECISIONS.md) is the one-line plain-language explanation shown next
// to each reason in the modal — kept alongside `label` so the modal and
// any future picker read from one source, never a second hardcoded copy
// of the taxonomy. Reason codes (`value`) are unchanged.
export const REPORT_CATEGORIES: { value: ReportCategory; label: string; description: string; isRedLine: boolean }[] = [
  { value: "underage", label: "Underage", description: "Involves someone under 18.", isRedLine: true },
  {
    value: "below_membership_age",
    label: `Under ${MIN_MEMBER_AGE} (eligibility)`,
    description: `Member appears to be under the club's minimum membership age (${MIN_MEMBER_AGE}) — not a child-safety concern.`,
    isRedLine: false,
  },
  {
    value: "non_consensual",
    label: "Non-consensual",
    description: "Shared without the person's consent.",
    isRedLine: true,
  },
  { value: "threat", label: "Threat", description: "Threatens someone's safety.", isRedLine: true },
  {
    value: "doxxing",
    label: "Doxxing",
    description: "Reveals someone's real identity or location.",
    isRedLine: false,
  },
  {
    value: "commercial_solicitation",
    label: "Commercial solicitation",
    description: "Selling or advertising services.",
    isRedLine: false,
  },
  { value: "other", label: "Other", description: "Something else.", isRedLine: false },
];

export function isRedLineCategory(category: ReportCategory): boolean {
  return REPORT_CATEGORIES.find((c) => c.value === category)?.isRedLine ?? false;
}
