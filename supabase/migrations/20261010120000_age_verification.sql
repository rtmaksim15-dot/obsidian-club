-- 21+ Age Verification Gate, Phase A (2026-10-10, see DECISIONS.md and
-- the Phase A report). NOT YET APPLIED to the live database — Rule 11
-- (CLAUDE.md): any production schema/data change needs explicit,
-- action-naming permission before running. Shown here for review.

-- ModerationAction.adminId becomes nullable so a SYSTEM-initiated
-- action (the Yoti/mock pass that flips a member's ageVerified) can be
-- logged through the same table every admin-triggered action already
-- uses, without a second logging mechanism. Existing rows are
-- untouched — every one of them already has a real admin_id.
alter table "moderation_actions" alter column "admin_id" drop not null;
alter table "moderation_actions" add column if not exists "actor_label" text;

create type "AgeVerificationProvider" as enum ('yoti', 'mock');
create type "AgeVerificationStatus" as enum ('pending', 'passed', 'failed', 'expired', 'cancelled');

-- One row per verification ATTEMPT (see prisma/schema.prisma's model
-- comment for why not one row per user). Never stores DOB, images, or
-- any raw provider payload — only the outcome.
create table "age_verifications" (
    "id" uuid primary key default gen_random_uuid(),
    "user_id" uuid not null references "users"("id"),
    "provider" "AgeVerificationProvider" not null,
    "provider_session_id" text not null unique,
    "status" "AgeVerificationStatus" not null default 'pending',
    "method" text,
    "threshold" integer not null,
    "attempt_number" integer not null,
    "created_at" timestamptz not null default now(),
    "completed_at" timestamptz
);

create index "age_verifications_user_id_created_at_idx" on "age_verifications" ("user_id", "created_at");
create index "age_verifications_status_idx" on "age_verifications" ("status");

-- RLS (task spec A2: user reads own rows; writes are server-only via
-- Prisma, which uses the service role and bypasses RLS entirely, same
-- as every other table in this app — no INSERT/UPDATE policy is
-- defined or needed).
alter table "age_verifications" enable row level security;

create policy "age_verifications_own_read" on "age_verifications"
  for select using (auth.uid() = "user_id");

-- Admin SELECT-all via a SECURITY DEFINER helper, NOT a direct join
-- against `users` in the policy body. `public.users` has RLS enabled
-- with zero SELECT policies (deny-all) — a policy here that joined
-- `users` directly would have that join itself subject to `users`'
-- RLS for the calling role, which returns nothing for everyone,
-- including a real admin (exactly the bug
-- 20260923030000_fix_messages_select_policy.sql found and fixed for
-- `messages`). NOTE while verifying this: `analytics_events_admin_read`
-- (20260726120000_analytics_events_rls.sql) has this same direct-join
-- shape and was NOT touched here — it predates the messages fix and is
-- a pre-existing issue outside this migration's scope; flagged in the
-- Phase A report for the owner's awareness, not fixed here.
create or replace function "public"."is_admin_caller"()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from "users" u where u.id = auth.uid() and u.is_admin = true
  );
$$;

create policy "age_verifications_admin_read" on "age_verifications"
  for select using ("public"."is_admin_caller"());
