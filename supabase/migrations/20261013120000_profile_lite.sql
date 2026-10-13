-- Package 4, Phase B: Profile lite (2026-10-13, see DECISIONS.md)
-- Member numbers, curated practice tags, confirmed bonds, private notes.
--
-- WRITTEN, NOT APPLIED — per CLAUDE.md rule 11, awaiting explicit
-- go-ahead naming this exact action. Verified against the live database
-- with `prisma migrate diff` (see DECISIONS.md): purely additive, no
-- existing table/column touched or dropped.
--
-- After applying: run `npm run check:rls` (CLAUDE.md rule 8). All four
-- new tables below enable RLS with zero policies (deny-all) — the
-- established pattern for every table in this schema that's only ever
-- read/written through Prisma, server-side, never a browser-side
-- Supabase client (see supabase/migrations/20260911000000_rls_admin_notes.sql
-- for the identical precedent). None of practice_tags/user_practices/
-- bonds/private_notes is ever subscribed to via Realtime or queried
-- directly from client code, so deny-all is correct and sufficient —
-- including for private_notes, where the task's own spec says
-- "RLS author-only": the real author-only boundary is enforced in the
-- API route (every read/write checks authorId against the session),
-- and deny-all is a STRICTER guarantee than a literal
-- `author_id = auth.uid()` SELECT policy would be, not a weaker one —
-- it means zero access via the anon/authenticated Supabase key at all,
-- not just access scoped to the row's own author.

-- ============================================================
-- B1: Member numbers
-- ============================================================

-- Backfilled 1..N by join date ascending (falling back to created_at
-- for any row with a null joined_at, so ordering is always
-- deterministic), excluding exactly one account: Lord Obsidian
-- (id e75c0f85-3b91-49c4-a610-0bc17839476a, see lib/config/founder.ts)
-- — ASSUMPTION, per this task's own instruction: the founder is
-- excluded from numbering entirely; the profile shows "Founder"
-- instead. That account's member_number stays NULL permanently.
--
-- A dedicated sequence (not a plain column DEFAULT referencing an
-- auto Postgres-managed identity) because new rows need a value
-- starting strictly after whatever the backfill assigned, not from 1 —
-- the sequence is created once the backfill's own max is known, and
-- prisma/schema.prisma's @default(dbgenerated("nextval(...)")) calls
-- it automatically on every future User row. The only place a User
-- row is ever created in this codebase today (app/api/join/[token]/
-- route.ts) already omits member_number from its create() call, so it
-- gets the next value for free — "new members get next number on
-- activation" with zero application code change, since that route
-- already sets status: "active" directly, with no separate pending
-- state for ordinary members to transition out of.

alter table users add column member_number integer;

with ordered as (
  select id, row_number() over (order by coalesce(joined_at, created_at) asc) as rn
  from users
  where id <> 'e75c0f85-3b91-49c4-a610-0bc17839476a'
)
update users
set member_number = ordered.rn
from ordered
where users.id = ordered.id;

create sequence member_number_seq owned by users.member_number;
select setval('member_number_seq', coalesce((select max(member_number) from users), 0));

alter table users alter column member_number set default nextval('member_number_seq');
alter table users add constraint users_member_number_key unique (member_number);

-- ============================================================
-- B2: Practices (curated tags — exactly this list, in this order;
-- never add a tag outside it, never accept free text)
-- ============================================================

create type "UserPracticeKind" as enum ('limit', 'practice', 'curious');

create table practice_tags (
  id     uuid primary key default gen_random_uuid(),
  slug   text not null unique,
  label  text not null,
  sort   integer not null,
  active boolean not null default true
);

insert into practice_tags (slug, label, sort) values
  ('shibari-rope-bondage',      'Shibari & rope bondage',      0),
  ('rope-suspension',           'Rope suspension',             1),
  ('leather',                   'Leather',                     2),
  ('latex',                     'Latex',                       3),
  ('corsetry',                  'Corsetry',                    4),
  ('uniforms',                  'Uniforms',                    5),
  ('boots',                     'Boots',                       6),
  ('collars',                   'Collars',                     7),
  ('cuffs-restraints',          'Cuffs & restraints',          8),
  ('blindfolds',                'Blindfolds',                  9),
  ('sensory-play',              'Sensory play',                10),
  ('wax-play',                  'Wax play',                    11),
  ('impact-play',               'Impact play',                 12),
  ('spanking',                  'Spanking',                    13),
  ('discipline-protocol',       'Discipline & protocol',       14),
  ('power-exchange-ds',         'Power exchange (D/s)',        15),
  ('service',                   'Service',                     16),
  ('chastity',                  'Chastity',                    17),
  ('role-play-between-adults',  'Role play between adults',    18),
  ('consensual-exhibitionism',  'Consensual exhibitionism',    19),
  ('consensual-voyeurism',      'Consensual voyeurism',        20),
  ('massage',                   'Massage',                     21),
  ('aesthetic-art-photography', 'Aesthetic & art photography', 22);

create table user_practices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  tag_id     uuid not null references practice_tags(id) on delete cascade,
  kind       "UserPracticeKind" not null,
  created_at timestamptz not null default now(),
  unique (user_id, tag_id)
);

create index user_practices_user_id_idx on user_practices(user_id);

-- ============================================================
-- B3: Bonds (confirmed relationships)
-- ============================================================

create type "BondKind" as enum ('partner', 'dominant_of', 'submissive_of');
create type "BondStatus" as enum ('pending', 'active');

create table bonds (
  id           uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id   uuid not null references users(id) on delete cascade,
  kind         "BondKind" not null,
  status       "BondStatus" not null default 'pending',
  visible      boolean not null default true,
  created_at   timestamptz not null default now(),
  responded_at timestamptz
);

create index bonds_from_user_id_idx on bonds(from_user_id);
create index bonds_to_user_id_idx on bonds(to_user_id);

-- ============================================================
-- B4: Private notes
-- ============================================================

create table private_notes (
  author_id  uuid not null references users(id) on delete cascade,
  subject_id uuid not null references users(id) on delete cascade,
  body       text not null,
  updated_at timestamptz not null default now(),
  primary key (author_id, subject_id)
);

-- ============================================================
-- RLS — deny-all on all four new tables (see header comment)
-- ============================================================

alter table practice_tags  enable row level security;
alter table user_practices enable row level security;
alter table bonds          enable row level security;
alter table private_notes  enable row level security;
