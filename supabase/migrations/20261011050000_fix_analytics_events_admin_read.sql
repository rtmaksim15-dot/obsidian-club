-- Fixes analytics_events_admin_read (20260726120000_analytics_events_rls.sql),
-- which joined `users` directly in the policy body to check is_admin.
-- Since `users` itself has RLS enabled with zero SELECT policies
-- (deny-all), that join is itself denied for the calling role, so this
-- policy returned nothing for every admin too, not just non-admins —
-- the exact bug 20260923030000_fix_messages_select_policy.sql already
-- found and fixed for `messages`. Found again while building this
-- session's age_verifications_admin_read policy (which used
-- public.is_admin_caller() from the start specifically to avoid it —
-- see 20261010120000_age_verification.sql), flagged in the Phase A
-- report, and fixed here on the owner's explicit go-ahead (2026-10-11).
drop policy if exists "analytics_events_admin_read" on "analytics_events";

create policy "analytics_events_admin_read" on "analytics_events"
  for select using ("public"."is_admin_caller"());
