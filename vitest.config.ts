import { defineConfig } from "vitest/config";
import path from "path";

// No test runner existed in this repo before the REP core engine package
// (2026-10-01, see DECISIONS.md) — added per that task's own instruction
// ("if none, add vitest"). Node environment by default; nothing most
// tests need is a DOM. Admin Linked Accounts (2026-11-22, see
// DECISIONS.md) added the first component-render tests this repo has
// ever had — those .tsx files opt into jsdom individually via a
// `// @vitest-environment jsdom` pragma at the top of the file rather
// than switching the whole suite's default, so the other ~350 tests
// stay on the lighter, faster node environment unchanged.
export default defineConfig({
  // jsx: "automatic" (2026-11-22, see DECISIONS.md) — vite/esbuild's
  // own JSX transform, independent of tsconfig's jsx: "preserve"
  // (that setting is for Next.js's own compiler, which vitest never
  // runs through); without this, a .tsx test gets esbuild's classic-
  // runtime default and fails at runtime with "React is not defined"
  // the moment it renders anything, since no component file in this
  // repo imports React itself (every one already assumes the
  // automatic runtime Next.js actually uses).
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
