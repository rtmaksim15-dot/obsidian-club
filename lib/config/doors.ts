// The Doors mechanic (pre-launch cleanup, 2026-08-08) — the October 1
// cohort launch gate. Unlike feature-flags.ts's compile-time booleans,
// this reads a runtime env var (`DOORS_OPEN_DATE`) and compares it to
// the current time on every call, so flipping the launch date or
// unsetting the var takes effect immediately with no redeploy of code,
// only a Vercel env var change.
//
// Absent var = feature off (normal, pre-configuration state — nothing
// locked). Present-but-unparseable var fails CLOSED (antechamber stays
// active) rather than open — a typo'd date should mean "members wait a
// little longer," not "the club opens early by accident."
export type DoorsState = { active: boolean; date: Date | null };

export function getDoorsState(): DoorsState {
  const raw = process.env.DOORS_OPEN_DATE;
  if (!raw) return { active: false, date: null };

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    console.error(
      `[doors] DOORS_OPEN_DATE is set but unparseable: "${raw}" — failing closed (antechamber stays active).`,
    );
    return { active: true, date: null };
  }

  return { active: Date.now() < date.getTime(), date };
}

const ORDINAL_SUFFIXES = ["th", "st", "nd", "rd"];

function ordinal(n: number): string {
  const v = n % 100;
  return `${n}${ORDINAL_SUFFIXES[(v - 20) % 10] || ORDINAL_SUFFIXES[v] || ORDINAL_SUFFIXES[0]}`;
}

/** "October 1st" — no year, matching the ceremonial tone of the rest of the ritual/antechamber copy. */
export function formatDoorsDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  return `${month} ${ordinal(date.getUTCDate())}`;
}
