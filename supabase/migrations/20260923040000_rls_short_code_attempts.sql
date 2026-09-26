-- Security fix (2026-09-23, see DECISIONS.md) — ShortCodeAttempt is
-- only ever read/written via Prisma from POST /api/join/resolve-code
-- and (for admin review) the admin console, both server-side, same
-- deny-all-by-default posture as every other admin-only table in this
-- schema (e.g. admin_notes, rate_limit_hits).
alter table short_code_attempts enable row level security;
