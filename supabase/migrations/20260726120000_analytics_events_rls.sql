-- Analytics event log RLS (SPEC-analytics-panel.md §2.4).
--
-- Table/column names corrected against the real schema, not copied
-- verbatim from the spec:
--   * table is `analytics_events`, not `events` (that name is already
--     the real-world offline-Event model's table — see
--     prisma/schema.prisma's ANALYTICS section comment)
--   * "userId" is a real `uuid` column here (not text), so the
--     own-row policy compares directly against auth.uid() with no
--     `::text` cast — casting would be a type error the other way
--     (uuid = text has no operator)
--   * admins are identified by `users.is_admin = true` (a real boolean
--     column), not `users.role = 'ADMIN'` — this app's `role` column
--     is MemberRole (dominant/submissive/switch/...), an unrelated
--     kink-orientation field, not a permission level

alter table analytics_events enable row level security;

-- Writes only ever happen via the service role (lib/analytics/track.ts,
-- lib/auth/supabase-admin.ts), which bypasses RLS entirely — no INSERT
-- policy is defined or needed.

-- A member reads only their own events.
create policy analytics_events_own_read on analytics_events
  for select using (auth.uid() = "userId");

-- Admins read everything.
create policy analytics_events_admin_read on analytics_events
  for select using (
    exists (
      select 1 from users u
      where u.id = auth.uid() and u.is_admin = true
    )
  );
