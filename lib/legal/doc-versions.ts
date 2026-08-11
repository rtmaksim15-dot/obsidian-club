// Bump a value by hand whenever that document's substance changes
// materially (not for typo fixes) — see DECISIONS.md. A member's most
// recent LegalConsent row is compared against these; if it predates the
// current version for any of the three, they see the re-consent
// interstitial on next login.
export const LEGAL_DOC_VERSIONS = {
  terms: "2026-08-11.0",
  privacy: "2026-08-11.0",
  aup: "2026-08-11.0",
} as const;
