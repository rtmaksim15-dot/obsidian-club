-- Multi-photo posts, Phase C (2026-10-10, see DECISIONS.md and the
-- Phase C report). Applied live 2026-10-11 on the owner's explicit
-- go-ahead per Rule 11 (CLAUDE.md) — see DECISIONS.md's 2026-10-11
-- entry for the backfill counts and RLS test output.

create table "post_images" (
    "id" uuid primary key default gen_random_uuid(),
    "post_id" uuid not null references "posts"("id") on delete cascade,
    "position" integer not null,
    "storage_path" text not null,
    "width" integer,
    "height" integer,
    "is_deleted" boolean not null default false,
    "created_at" timestamptz not null default now(),
    unique ("post_id", "position")
);

create index "post_images_post_id_idx" on "post_images" ("post_id");

-- Backfill: every existing post's single photo (position 0), without
-- touching the underlying Storage object at all — same bucket, same
-- path, just a new row pointing at it. `mediaUrls` itself is left
-- exactly as-is (not cleared, not dropped) — see Post.images' schema
-- comment for why it's kept, unread, going forward.
insert into "post_images" ("id", "post_id", "position", "storage_path", "created_at")
select gen_random_uuid(), "id", 0, "media_urls" ->> 0, "created_at"
from "posts"
where jsonb_typeof("media_urls") = 'array' and jsonb_array_length("media_urls") > 0;

-- RLS: deny-all, same posture as `posts` itself (confirmed in Phase A's
-- research — nothing in this codebase reads Post/PostImage via a
-- direct anon/authenticated Supabase client; every real read/write
-- goes through Prisma, whose role has BYPASSRLS). "RLS mirrors Post
-- visibility" means mirroring Post's own deny-all, not inventing a new
-- real policy where none is needed.
alter table "post_images" enable row level security;

-- C6 — a report can target a specific image within a post.
alter table "reports" add column if not exists "image_id" uuid;
