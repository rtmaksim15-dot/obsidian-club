-- Membership eligibility raised to MIN_MEMBER_AGE (see lib/legal/eligibility.ts).
-- Additive enum value only — existing "underage" rows and the child-safety
-- flow they trigger are completely untouched.
alter type "ReportCategory" add value if not exists 'below_membership_age';
