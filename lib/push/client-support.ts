// Web Push, Package N1 (2026-10-25, see DECISIONS.md). Pure — takes
// userAgent/standalone as plain arguments rather than reading
// navigator/matchMedia directly, so NotificationSettingsForm.tsx's own
// platform-detection logic is unit-testable without a DOM (this
// project's test runner is Node-only — vitest.config.ts's own
// comment). iOS detection via UA substring is a known-imprecise
// heuristic (iPadOS 13+ can report as "Macintosh" with touch support)
// — acceptable here since the worst case is a Mac-reporting iPad
// seeing the normal Enable button instead of the install prompt, not a
// wrong permission request.
export function isIOSUserAgent(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent);
}

/** True when the visitor needs the "install to Home Screen first" message instead of (or alongside) the Enable button — iOS only supports Web Push from an installed, standalone PWA (16.4+). */
export function needsIOSInstallPrompt(userAgent: string, isStandalone: boolean): boolean {
  return isIOSUserAgent(userAgent) && !isStandalone;
}

// Web Push's applicationServerKey wants a Uint8Array, not the
// URL-safe-base64 string VAPID keys are generated/stored as.
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
