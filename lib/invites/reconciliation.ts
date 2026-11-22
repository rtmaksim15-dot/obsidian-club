import "server-only";
import { prisma } from "@/lib/db/prisma";
import { classifyInviteRow, hasApplied, type InviteWaitlistStatus } from "./funnel";

// Invite list reconciliation, 2026-11-21 (see DECISIONS.md). One shared
// query (invite_list LEFT JOIN users LEFT JOIN waitlist, all on
// lower(trim(email))) rather than one query per metric — 907 rows is
// small enough that fetching the raw per-row matches once and bucketing
// in JS is both simpler and cheaper than four separate aggregate
// queries that would each re-derive the same join. invite_list.email
// is already normalized at import time (scripts/import-invite-list.ts);
// users.email/waitlist.email are normalized here at query time since
// neither has that guarantee at the schema level — see
// lib/invites/matching.ts's own comment.
//
// Funnel, confirmed 2026-11-21: invited -> applied (Waitlist row
// exists, any status) -> pending approval / approved (current
// Waitlist status, among those not yet registered) -> active account
// (User exists). "Applied" is a standalone total, not mutually
// exclusive with "active account" — see lib/invites/funnel.ts's own
// comment for why.
export type InviteListTotals = {
  invited: number;
  applied: number;
  pendingApproval: number;
  approved: number;
  activeAccount: number;
  conversionRate: number; // activeAccount / invited, 0–100, one decimal
};

export type CountryBreakdownRow = { country: string; invited: number; activeAccount: number };

export type RegistrationsByDayRow = { day: string; count: number }; // day: "YYYY-MM-DD"

export type UnmatchedRow = {
  id: string;
  displayName: string;
  email: string;
  eventAt: string | null;
  kind: "user" | "applicant";
};

export type InviteListReconciliation = {
  totals: InviteListTotals;
  byCountry: CountryBreakdownRow[];
  registrationsByDay: RegistrationsByDayRow[];
  unmatched: UnmatchedRow[];
};

type JoinedRow = {
  country: string | null;
  is_active: boolean;
  joined_at: Date | null;
  waitlist_status: InviteWaitlistStatus | null;
};

export async function getInviteListReconciliation(): Promise<InviteListReconciliation> {
  const joined = await prisma.$queryRaw<JoinedRow[]>`
    select
      il.country,
      (u.id is not null) as is_active,
      u.joined_at,
      w.status as waitlist_status
    from invite_list il
    left join users u
      on lower(trim(u.email)) = il.email and u.status = 'active'
    left join waitlist w
      on lower(trim(w.email)) = il.email
  `;

  let applied = 0;
  let activeAccount = 0;
  let approved = 0;
  let pendingApproval = 0;
  const byCountry = new Map<string, { invited: number; activeAccount: number }>();
  const byDay = new Map<string, number>();

  for (const row of joined) {
    const countryLabel = row.country ?? "(unknown)";
    const countryStats = byCountry.get(countryLabel) ?? { invited: 0, activeAccount: 0 };
    countryStats.invited += 1;

    const bucket = classifyInviteRow({ isActiveAccount: row.is_active, waitlistStatus: row.waitlist_status });
    if (hasApplied(bucket)) applied += 1;

    if (bucket === "activeAccount") {
      activeAccount += 1;
      countryStats.activeAccount += 1;
      if (row.joined_at) {
        const day = row.joined_at.toISOString().slice(0, 10);
        if (day >= "2026-11-21") byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
    } else if (bucket === "approved") {
      approved += 1;
    } else if (bucket === "pendingApproval") {
      pendingApproval += 1;
    }

    byCountry.set(countryLabel, countryStats);
  }

  const invited = joined.length;

  // "Applicants/users NOT on the list": active Users and Waitlist rows
  // whose (normalized) email matches no invite_list row, deduped so a
  // person who both applied AND registered under the same email is
  // listed once, as a user — not twice.
  const unmatchedRows = await prisma.$queryRaw<
    { id: string; display_name: string; email: string; event_at: Date | null; kind: "user" | "applicant" }[]
  >`
    select u.id, u.display_name, u.email, u.joined_at as event_at, 'user' as kind
    from users u
    where u.status = 'active'
      and not exists (select 1 from invite_list il where il.email = lower(trim(u.email)))
    union all
    select w.id, coalesce(w.name, w.email) as display_name, w.email, w.created_at as event_at, 'applicant' as kind
    from waitlist w
    where not exists (select 1 from invite_list il where il.email = lower(trim(w.email)))
      and not exists (
        select 1 from users u2 where lower(trim(u2.email)) = lower(trim(w.email)) and u2.status = 'active'
      )
    order by event_at desc nulls last
  `;

  return {
    totals: {
      invited,
      applied,
      pendingApproval,
      approved,
      activeAccount,
      conversionRate: invited > 0 ? Math.round((activeAccount / invited) * 1000) / 10 : 0,
    },
    byCountry: Array.from(byCountry.entries())
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => b.invited - a.invited),
    registrationsByDay: Array.from(byDay.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    unmatched: unmatchedRows.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      eventAt: u.event_at ? u.event_at.toISOString() : null,
      kind: u.kind,
    })),
  };
}
