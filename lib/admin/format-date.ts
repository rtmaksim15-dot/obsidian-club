// Admin console timestamps — one consistent basis (2026-09-23, see
// DECISIONS.md). Every admin zone previously formatted its own
// timestamps in UTC (each component had its own local `formatDate`,
// `timeZone: "UTC"`), except the Security zone's sign-in log, which was
// already America/New_York (the admin's own timezone) — the two bases
// disagreeing by several hours is exactly what made an Accept clicked
// at 11:08 PM local read back as "Sep 23, 3:08 AM," a full calendar day
// ahead of what the admin actually experienced. Every admin-console
// timestamp now goes through this one function instead: America/New_York,
// with the zone abbreviation always shown (DST-aware — EDT or EST,
// whichever is correct for that date) so it's unambiguous at a glance.
const ADMIN_TIME_ZONE = "America/New_York";

export function formatAdminDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const dateTime = date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: ADMIN_TIME_ZONE });
  const zoneName = new Intl.DateTimeFormat("en-US", { timeZone: ADMIN_TIME_ZONE, timeZoneName: "short", hour: "numeric" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  return zoneName ? `${dateTime} ${zoneName}` : dateTime;
}

export function formatAdminDateOnly(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: ADMIN_TIME_ZONE });
}
