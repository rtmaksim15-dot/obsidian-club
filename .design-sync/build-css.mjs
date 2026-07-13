// design-sync CSS build step (cfg.buildCmd).
//
// Obsidian Club is a Next.js app, not a component library: its design tokens
// and component classes live in app/globals.css (@layer base/components) and
// its utilities are Tailwind classes generated on demand from the JSX. There
// is no shipped stylesheet, so we compile one here for the design-sync bundle:
//
//   1. Run Tailwind over app/globals.css (it reads tailwind.config.ts for the
//      ob-* palette + content globs, so every utility the components use plus
//      the :root vars and the .card/.btn-*/.text-*/.input/.avatar component
//      classes end up in the output).
//   2. Prepend a Google Fonts @import for Cinzel / Cormorant Garamond / Inter.
//      The app loads these via next/font (CSS variables); outside Next those
//      vars are absent, but globals.css falls back to the literal family names
//      ("Cinzel", "Cormorant Garamond", "Inter"), so importing the real
//      families here makes the fallback resolve. The @import is the first rule
//      in the file so it stays valid when the converter appends it into
//      _ds_bundle.css.
//
// Output: .design-sync/.cache/ds.css  (cfg.cssEntry points here; gitignored,
// regenerated every run — deterministic, so a re-run is a no-op).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const CACHE = ".design-sync/.cache";
mkdirSync(CACHE, { recursive: true });

execFileSync(
  "node_modules/.bin/tailwindcss",
  ["-c", ".design-sync/tailwind.config.ts", "-i", "app/globals.css", "-o", `${CACHE}/tw.css`, "--minify"],
  { stdio: "inherit" },
);

const FONTS =
  "@import url('https://fonts.googleapis.com/css2?" +
  "family=Cinzel:wght@400;600;700&" +
  "family=Cormorant+Garamond:wght@300;400;500;600&" +
  "family=Inter:wght@400;500;600&display=swap');\n";

writeFileSync(`${CACHE}/ds.css`, FONTS + readFileSync(`${CACHE}/tw.css`, "utf8"));
console.error(`  build-css: wrote ${CACHE}/ds.css`);
