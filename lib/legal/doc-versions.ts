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

// Direct Messages (2026-09-14, see DECISIONS.md) — versioned
// independently of the three above: it's a narrower, feature-specific
// ruleset, not part of the platform-wide re-consent gate
// (lib/legal/reconsent.ts deliberately never reads this).
export const DM_RULES_VERSION = "2026-09-15.0";
