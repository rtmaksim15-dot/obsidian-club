-- Private storage (task 2, 2026-09-23, see DECISIONS.md). Every real
-- read in this app already goes through the service-role client (which
-- bypasses RLS by design, regardless of any policy here) to mint a
-- short-lived signed URL — no anon/authenticated-role client ever
-- reads storage.objects directly. RLS on storage.objects is already ON
-- (a Supabase-managed system table) with zero existing policies, which
-- Postgres RLS semantics already treat as deny-all for every non-
-- superuser role — this migration doesn't change that behavior, it
-- makes the intent explicit and auditable rather than an artifact of
-- "nobody happened to add a policy yet." Scoped to post-photos and
-- avatars specifically (not every bucket this project might ever add),
-- and applies to both anon and authenticated, since neither should
-- ever read Storage rows directly, whether or not a request happens to
-- carry a signed-in session.
create policy "post_photos_deny_direct_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'post-photos' and false);

create policy "avatars_deny_direct_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'avatars' and false);
