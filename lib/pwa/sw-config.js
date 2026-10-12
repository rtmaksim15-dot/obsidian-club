// PWA hardening, Package 3 follow-up — SW kill switch (2026-10-11, see
// DECISIONS.md). Plain .js (not .ts) specifically so scripts/
// generate-sw.js — a plain `node` script at build time, no tsx/ts-node
// — can require() it with zero build step; components/shared/
// PwaUpdateManager.tsx imports the same file (tsconfig's allowJs
// covers this). Default (NEXT_PUBLIC_SW_ENABLED unset) is enabled —
// only the literal string "false" disables it.
//
// @param {string | undefined} envValue
// @returns {boolean}
function isServiceWorkerEnabled(envValue) {
  return envValue !== "false";
}

module.exports = { isServiceWorkerEnabled };
