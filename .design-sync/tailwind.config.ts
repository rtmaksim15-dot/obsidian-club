// design-sync Tailwind config. Extends the app's real config but adds a
// safelist so the SHIPPED design-system stylesheet carries the full brand
// vocabulary — not just the subset the app happens to use today. The design
// agent builds NEW markup with these utilities, so the whole ob-* palette,
// the brand fonts, brand tracking, and the dynamic avatar-level-N rings
// (written as `avatar-level-${level}` in source, invisible to the purge scan)
// must all be present.
import type { Config } from "tailwindcss";
import base from "../tailwind.config";

const config: Config = {
  ...base,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Full ob-* palette across the utilities an agent reaches for.
    {
      pattern:
        /^(bg|text|border|ring|fill|stroke|from|to|via)-ob-(black|dark|elevated|surface|accent|accent-h|gold|text|muted|subtle|border)$/,
    },
    // Level rings (dynamic class in source).
    { pattern: /^avatar-level-[1-6]$/ },
    // Brand fonts + tracking.
    "font-cinzel",
    "font-cormorant",
    "font-inter",
    { pattern: /^tracking-(brand|wide-brand|ultra)$/ },
    { pattern: /^rounded-ob$/ },
  ],
};

export default config;
