-- Caught by scripts/check-rls.ts immediately after prisma db push added
-- legal_consents (registration consent-versioning, Block 4, 2026-08-10).
-- Deny-all is correct: only ever written by app/api/join/[token]/route.ts
-- and app/api/invite/[token]/route.ts at account creation, and read by
-- the re-consent interstitial check on login — always server-side via
-- Prisma, never by a browser-side Supabase client. Consent records
-- (userId, doc versions, timestamp, IP) must never be exposed
-- client-side per the original spec.

alter table legal_consents enable row level security;
