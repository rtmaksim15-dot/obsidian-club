# design-sync notes — Obsidian Club

This repo is a **Next.js application**, not a component-library design system.
The sync is a deliberate best-effort import (user opted in knowing components are
app-coupled). Everything below is the scaffolding that makes that work.

## Shape & entry
- `shape: package`, but there is **no dist/**. Components are `export default`
  Next.js app modules under `components/`, so:
  - `--entry .design-sync/entry.mjs` — a hand-written entry that re-exports each
    default under its name (a synthesized `export *` entry would drop every
    default export). PKG_DIR resolves to the repo root by walking up from the
    entry to the first named package.json.
  - `srcDir: components` is required — `lib/` exists and would otherwise win the
    default srcRoot probe (`src|lib|components`).
  - `tsconfig: tsconfig.json` so esbuild resolves the `@/*` path alias.
- Run order: `node .design-sync/build-css.mjs` (cfg.buildCmd) → converter.

## CSS / tokens / fonts
- No shipped stylesheet. `build-css.mjs` compiles `app/globals.css` with Tailwind
  (reads tailwind.config.ts for the `ob-*` palette) → `.design-sync/.cache/ds.css`,
  which is `cfg.cssEntry`. It carries the `:root` design-token vars, the
  `@layer components` classes (`.card`, `.btn-*`, `.text-*`, `.input`, `.avatar-*`),
  and every Tailwind utility the components use.
- Fonts (Cinzel / Cormorant Garamond / Inter) load via a Google Fonts `@import`
  prepended in build-css.mjs. The app uses next/font CSS variables; outside Next
  those vars are absent but globals.css falls back to the literal family names,
  which the `@import` provides. Expect `[FONT_REMOTE]` (informational).

## Preview provider
- `cfg.provider = NextNavProvider` (`.design-sync/shims/next-nav-provider.tsx`,
  wired via cfg.extraEntries). Supplies stub Next AppRouter/Pathname/SearchParams
  contexts so `useRouter()` / `usePathname()` components render. Router methods
  are no-ops (previews are static).

## Per-component expectations
- **Logo — EXCLUDED from the sync.** It renders a Next `public/` asset
  (`/brand/oc-monogram.webp`) via an absolute path that never resolves in the
  design runtime, so the component is non-functional there (broken image). It's
  removed from componentSrcMap / entry.mjs. The brand mark lives in the shipped
  `guidelines/docs/LordObsidian.md` instead. Re-add only if the mark is inlined
  (data-URI) or served portably.
- **RoomChat** calls Supabase `createClient()` in a `useEffect` that reads
  `process.env.NEXT_PUBLIC_SUPABASE_*`. In the design runtime `process` is
  undefined and the throw would unmount the whole card (React 18). The provider
  shim stubs `globalThis.process.env` with demo values at bundle-load so the
  client constructs (and never connects). Renders fine with 3 seeded messages.
- **AvatarUploadButton** renders the real uploadthing `UploadButton`; without
  UPLOADTHING_* env it shows uploadthing's raw file input + "Change avatar".
  Faithful to the unconfigured app state.
- **Reveal / RevealGroup** use IntersectionObserver-driven fade-in; the capture
  catches them (near-)revealed — RevealGroup even shows the per-index stagger.

## Known render warns (checked against on re-sync)
- **[RENDER_BLANK] BottomNav** — benign. BottomNav is `sm:hidden` (mobile-only),
  so the desktop-width render-check screenshots it blank. Its CARD uses the
  mobile viewport override (`cfg.overrides.BottomNav`) and renders the 5-tab nav
  correctly (confirmed in the capture sheet, Feed tab active). Do NOT treat this
  as a new failure.
- **[FONT_REMOTE]** Cinzel / Cormorant Garamond / Inter — expected (remote
  Google Fonts @import, see CSS section).

## Re-sync risks
- `build-css.mjs` output depends on the pinned Tailwind (3.4.1) and on Google
  Fonts being reachable at build/preview time. If fonts render as fallback serif,
  self-host woff2 via cfg.extraFonts instead of the remote @import.
- The JSX runtime: repo tsconfig is `jsx: preserve`, so esbuild emits classic
  `React.createElement` against a bare `React` global (provided by _vendor at
  render time). If previews ever fail "React is not defined", the fix is a
  declared lib override adding `jsx: 'automatic'` to lib/bundle.mjs sharedBuildOptions.
- componentSrcMap is a full enumeration (no dist .d.ts to discover from); adding
  a new component to the app means adding it here + in entry.mjs.
- The shipped stylesheet's brand-utility coverage comes from the safelist in
  `.design-sync/tailwind.config.ts` (full `ob-*` palette, `font-*`, `tracking-*`,
  `avatar-level-N`), NOT from app usage. If the app adds new brand tokens/utilities
  the agent should use, extend that safelist or they won't be in `_ds_bundle.css`.
- `.d.ts` prop contracts are hand-written in `cfg.dtsPropsFor` (no dist types). If
  a component's props change in source, update dtsPropsFor to match.
