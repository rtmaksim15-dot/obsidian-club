-- Sponsor tracking for admin vetting (2026-11-22, see DECISIONS.md).
-- waitlist.invited_by already existed as a bare uuid column with no
-- foreign key — never written by any code path until now. Adds the
-- actual FK with ON DELETE SET NULL, matching the identical, already-
-- live pattern on users.partner_id and users.invited_by (confirmed via
-- pg_constraint before writing this, not assumed): deleting the
-- sponsor's account drops the reference instead of blocking the
-- delete or leaving it dangling.
alter table waitlist
  add constraint waitlist_invited_by_fkey
  foreign key (invited_by) references users(id) on delete set null;
