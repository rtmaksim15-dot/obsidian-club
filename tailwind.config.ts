import type { Config } from "tailwindcss";

// Obsidian Club — brand tokens (source of truth: DESIGN.md §9).
// Do not add generic Tailwind blue/green/gray usage — only ob-* tokens.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "ob-black": "#0A0908",
        "ob-dark": "#111009",
        "ob-elevated": "#1A1816",
        "ob-surface": "#221F1C",
        "ob-accent": "#8B1A1A",
        "ob-accent-h": "#A01F1F",
        "ob-gold": "#C9A84C",
        "ob-text": "#EDEAE4",
        "ob-muted": "#9E9A94",
        "ob-subtle": "#5C5955",
        "ob-border": "#2A2724",
      },
      fontFamily: {
        // Values map to the next/font CSS variables set in app/layout.tsx,
        // with the literal family name kept as a fallback.
        cinzel: ["var(--font-cinzel)", "Cinzel", "serif"],
        cormorant: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      letterSpacing: {
        brand: "0.15em",
        "wide-brand": "0.25em",
        ultra: "0.3em",
      },
      borderRadius: {
        ob: "2px", // фирменный мин. радиус
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        accentPulse: {
          "0%, 100%": { boxShadow: "0 0 8px var(--color-accent-glow)" },
          "50%": { boxShadow: "0 0 16px var(--color-accent-glow)" },
        },
        obDrift: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.06)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.6s ease both",
        "ob-drift": "obDrift 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
