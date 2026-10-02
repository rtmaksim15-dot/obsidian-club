import { defineConfig } from "vitest/config";
import path from "path";

// No test runner existed in this repo before the REP core engine package
// (2026-10-01, see DECISIONS.md) — added per that task's own instruction
// ("if none, add vitest"). Node environment only; nothing here needs a DOM.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
