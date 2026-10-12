// Runs as package.json's "postbuild" (npm auto-runs this after
// "npm run build" — same pattern as the existing "prebuild"/
// "postinstall" hooks). Stamps scripts/sw-template.js with the real
// build id `next build` just wrote, so public/sw.js (gitignored,
// never committed) changes bytes on every deploy — see
// scripts/sw-template.js's own header comment for why that matters.
//
// SW kill switch (2026-10-11, see DECISIONS.md): when
// NEXT_PUBLIC_SW_ENABLED is the literal string "false", this emits
// scripts/sw-killswitch-template.js instead — a self-destructing
// worker that wipes every cache and unregisters itself on activate,
// so an already-installed app cleans itself up the next time the
// browser revalidates /sw.js (forced every time by its own
// Cache-Control: no-cache header, set in next.config.mjs), without a
// manual reinstall.
const fs = require("fs");
const path = require("path");
const { isServiceWorkerEnabled } = require("../lib/pwa/sw-config");

const root = path.join(__dirname, "..");
const swPath = path.join(root, "public", "sw.js");

if (!isServiceWorkerEnabled(process.env.NEXT_PUBLIC_SW_ENABLED)) {
  const killSwitch = fs.readFileSync(path.join(root, "scripts", "sw-killswitch-template.js"), "utf8");
  fs.writeFileSync(swPath, killSwitch);
  console.log("[generate-sw] NEXT_PUBLIC_SW_ENABLED=false — emitted the self-destruct sw.js");
} else {
  const buildId = fs.readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();
  const template = fs.readFileSync(path.join(root, "scripts", "sw-template.js"), "utf8");
  fs.writeFileSync(swPath, template.replace("__BUILD_ID__", buildId));
  console.log(`[generate-sw] public/sw.js stamped with build ${buildId}`);
}
