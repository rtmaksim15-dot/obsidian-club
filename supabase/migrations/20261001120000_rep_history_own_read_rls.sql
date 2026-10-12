-- REP core engine extension (2026-10-01, see DECISIONS.md and
-- docs/REP_AUDIT.md) — adds the one real policy `rep_history` was
-- missing. RLS itself was already enabled on this table by
-- 20260804090000_rls_sweep_remaining_tables.sql, but with zero policies
-- defined, which is deny-all for `anon`/`authenticated`; only the
-- service-role connection (BYPASSRLS) could read or write it at all.
--
-- Column note, unlike analytics_events' RLS migration: `rep_history`'s
-- user id column is `user_id` (snake_case, via Prisma's `@map("user_id")`
-- on RepHistory.userId), not a bare `"userId"` — analytics_events has no
-- such @map, so its column really is camelCase in Postgres. Comparing
-- directly against `auth.uid()` (uuid = uuid, no cast) either way.
--
-- Deliberately NOT mirroring analytics_events_admin_read: all admin
-- reads of REP data go through server code using the service-role
-- client (which already bypasses RLS entirely), gated by the existing
-- `user.isAdmin` check (lib/auth/admin-allowlist.ts) — there is no
-- authenticated-role admin SQL policy here by design, per this
-- package's own spec. No INSERT/UPDATE/DELETE policy is added either;
-- all writes go through lib/rep/ledger.ts (and the existing
-- lib/rating/rep-engine.ts#awardRep) on the server, via the service role.

create policy rep_history_own_read on rep_history
  for select using (auth.uid() = user_id);
