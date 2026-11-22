import "server-only";
import { prisma } from "@/lib/db/prisma";

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
// Bucketed with a strict precedence per invite-list row — registered
// > approved > pending approval > (not yet applied) — so a person who
// applied, got approved, AND has since redeemed their invite only ever
// counts once, under "registered," never double-counted into "approved"
// too.
export type InviteListTotals = {
  invited: number;
  registered: number;
  pendingApproval: number;
  approved: number;
  conversionRate: number; // registered / invited, 0–100, one decimal
};

export type CountryBreakdownRow = { country: string; invited: number; registered: number };

export type RegistrationsByDayRow = { day: string; count: number }; // day: "YYYY-MM-DD"

export type UnmatchedUserRow = {
  id: string;
  displayName: string;
  email: string;
  joinedAt: string | null;
};

export type InviteListReconciliation = {
  totals: InviteListTotals;
  byCountry: CountryBreakdownRow[];
  registrationsByDay: RegistrationsByDayRow[];
  unmatchedUsers: UnmatchedUserRow[];
};

type JoinedRow = {
  country: string | null;
  is_registered: boolean;
  joined_at: Date | null;
  waitlist_status: "pending" | "held" | "approved" | "declined" | null;
};

export async function getInviteListReconciliation(): Promise<InviteListReconciliation> {
  const joined = await prisma.$queryRaw<JoinedRow[]>`
    select
      il.country,
      (u.id is not null) as is_registered,
      u.joined_at,
      w.status as waitlist_status
    from invite_list il
    left join users u
      on lower(trim(u.email)) = il.email and u.status = 'active'
    left join waitlist w
      on lower(trim(w.email)) = il.email
  `;

  let registered = 0;
  let approved = 0;
  let pendingApproval = 0;
  const byCountry = new Map<string, { invited: number; registered: number }>();
  const byDay = new Map<string, number>();

  for (const row of joined) {
    const countryLabel = row.country ?? "(unknown)";
    const countryStats = byCountry.get(countryLabel) ?? { invited: 0, registered: 0 };
    countryStats.invited += 1;

    if (row.is_registered) {
      registered += 1;
      countryStats.registered += 1;
      if (row.joined_at) {
        const day = row.joined_at.toISOString().slice(0, 10);
        if (day >= "2026-11-21") byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
    } else if (row.waitlist_status === "approved") {
      approved += 1;
    } else if (row.waitlist_status === "pending" || row.waitlist_status === "held") {
      pendingApproval += 1;
    }

    byCountry.set(countryLabel, countryStats);
  }

  const invited = joined.length;

  const unmatchedUserRows = await prisma.$queryRaw<
    { id: string; display_name: string; email: string; joined_at: Date | null }[]
  >`
    select u.id, u.display_name, u.email, u.joined_at
    from users u
    where u.status = 'active'
      and not exists (
        select 1 from invite_list il where il.email = lower(trim(u.email))
      )
    order by u.joined_at desc nulls last
  `;

  return {
    totals: {
      invited,
      registered,
      pendingApproval,
      approved,
      conversionRate: invited > 0 ? Math.round((registered / invited) * 1000) / 10 : 0,
    },
    byCountry: Array.from(byCountry.entries())
      .map(([country, stats]) => ({ country, ...stats }))
      .sort((a, b) => b.invited - a.invited),
    registrationsByDay: Array.from(byDay.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    unmatchedUsers: unmatchedUserRows.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      email: u.email,
      joinedAt: u.joined_at ? u.joined_at.toISOString() : null,
    })),
  };
}
