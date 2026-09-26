-- Records which numeric threshold an ageVerified flip was actually
-- checked against (see lib/legal/eligibility.ts, User/Waitlist schema
-- comments). Purely additive, nullable columns — no existing row is
-- touched; every current ageVerified=true row stays null here since
-- none of them were checked against any real threshold at all.
alter table "users" add column if not exists "age_verified_threshold" integer;
alter table "waitlist" add column if not exists "age_verified_threshold" integer;
