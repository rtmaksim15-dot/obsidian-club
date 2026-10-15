// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md) —
// task 5's "browser/OS" line in the admin sign-in alert email. A
// deliberately small, regex-based heuristic rather than a new
// dependency (ua-parser-js or similar) — this project has consistently
// avoided adding a package for something a dozen lines of plain code
// covers (see lib/utils/compressImage.ts, lib/utils/stripExif.ts for
// the same reasoning), and "Chrome on macOS" in a security notice email
// doesn't need to be exhaustively correct for every obscure client,
// just good enough for an admin glancing at an alert.
export function parseUserAgent(userAgent: string | null): { browser: string; os: string } {
  if (!userAgent) return { browser: "Unknown browser", os: "Unknown OS" };

  const os = (() => {
    if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS";
    if (/Android/.test(userAgent)) return "Android";
    if (/Mac OS X/.test(userAgent)) return "macOS";
    if (/Windows/.test(userAgent)) return "Windows";
    if (/Linux/.test(userAgent)) return "Linux";
    return "Unknown OS";
  })();

  // Order matters: Edge/Opera/Chrome all include "Safari" in their UA
  // string (historical webkit-compat convention), and Chrome-based
  // browsers also include "Chrome" — most-specific token checked first.
  const browser = (() => {
    if (/EdgA|Edge|Edg\//.test(userAgent)) return "Edge";
    if (/OPR\/|Opera/.test(userAgent)) return "Opera";
    if (/CriOS/.test(userAgent)) return "Chrome"; // Chrome on iOS
    if (/FxiOS/.test(userAgent)) return "Firefox"; // Firefox on iOS
    if (/Firefox/.test(userAgent)) return "Firefox";
    if (/Chrome\//.test(userAgent)) return "Chrome";
    if (/Safari\//.test(userAgent)) return "Safari";
    return "Unknown browser";
  })();

  return { browser, os };
}
