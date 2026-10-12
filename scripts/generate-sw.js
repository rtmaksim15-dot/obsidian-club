// Runs as package.json's "postbuild" (npm auto-runs this after
// "npm run build" — same pattern as the existing "prebuild"/
// "postinstall" hooks). Stamps scripts/sw-template.js with the real
// build id `next build` just wrote, so public/sw.js (gitignored,
// never committed) changes bytes on every deploy — see
// scripts/sw-template.js's own header comment for why that matters.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const buildId = fs.readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();
const template = fs.readFileSync(path.join(root, "scripts", "sw-template.js"), "utf8");

fs.writeFileSync(path.join(root, "public", "sw.js"), template.replace("__BUILD_ID__", buildId));

console.log(`[generate-sw] public/sw.js stamped with build ${buildId}`);
