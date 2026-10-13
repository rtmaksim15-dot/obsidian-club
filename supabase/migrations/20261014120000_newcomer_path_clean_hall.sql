-- Package 5, Phase B: Clean Hall + test accounts (2026-10-14, see DECISIONS.md)
--
-- WRITTEN, NOT APPLIED — per CLAUDE.md rule 11, awaiting explicit
-- go-ahead naming this exact action. Verified against the live database
-- with `prisma migrate diff` (see DECISIONS.md): purely additive, two
-- new nullable/defaulted columns on existing tables — no table, no
-- existing column, no row touched or dropped.
--
-- Package 5, Phase A (Newcomer Path) needed no schema change at all —
-- see that phase's own DECISIONS.md entry. This single migration covers
-- everything Phase B needs.

-- B4: a pinned note on a room, rendered at the top of its chat (styled
-- as a Lord Obsidian note, not a chat message) — admin-editable only.
-- Seeded onto the newcomers room specifically with the task's own
-- exact text (not a placeholder) — every other room's pinned_note
-- stays null (nothing pinned) until an admin sets one.
alter table rooms add column pinned_note text;

update rooms
set pinned_note = 'Name yourself. Say what brought you here. In this hall, you are heard. — Lord Obsidian'
where slug = 'newcomers';

-- B6: admin-only flag. For a non-admin viewer, this account and
-- everything it authored is excluded from room chats/feed/member
-- lists/profiles (see lib/moderation/test-accounts.ts); an admin still
-- sees it, with a small "TEST" tag. Never deletes or alters any
-- account's data on its own.
alter table users add column is_test boolean not null default false;
