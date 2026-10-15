import fs from "fs";
import path from "path";
import { describe, expect, it, vi } from "vitest";

// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md),
// item 10 — "automated test that enumerates admin API routes and
// asserts anon -> 401 and member -> 403." Every one of these routes
// now starts with the exact same two lines (`const adminResult = await
// requireAdminApi(); if (!adminResult.ok) return adminResult.response;`
// — see that migration's own commit) BEFORE touching params, the
// request body, or Prisma, which is what makes a single generic
// enumeration test like this safe: every handler can be invoked with
// the same throwaway Request/params and is guaranteed to return before
// reaching any route-specific logic.
//
// "server-only" (lib/db/prisma.ts, lib/auth/supabase-admin.ts, etc.)
// throws when imported outside Next's own webpack server-graph — same
// workaround every other test in this codebase that needs to import a
// route module uses (see lib/dm/limits.test.ts).
vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

const ADMIN_API_DIR = path.join(__dirname); // app/api/admin

// This one route is a deliberate exception: a retired, always-410
// endpoint with no admin check at all (see its own file comment) —
// identity doesn't matter because it performs no action and returns no
// data regardless of caller. Every other file under app/api/admin is
// expected to use requireAdminApi().
const NO_GUARD_EXPECTED = new Set([path.join(ADMIN_API_DIR, "invite-batches", "route.ts")]);

function findRouteFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(full));
    } else if (entry.name === "route.ts") {
      files.push(full);
    }
  }
  return files;
}

const HTTP_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;

const routeFiles = findRouteFiles(ADMIN_API_DIR).filter((f) => !NO_GUARD_EXPECTED.has(f));

describe("every admin API route guards with requireAdminApi()", () => {
  it(`found at least one admin route file to check (sanity check the enumeration itself works — found ${routeFiles.length})`, () => {
    expect(routeFiles.length).toBeGreaterThan(15);
  });

  it.each(routeFiles.map((f) => [path.relative(ADMIN_API_DIR, f), f] as const))(
    "%s: anonymous -> 401, authenticated non-admin -> 403, for every exported HTTP method",
    async (_label, filePath) => {
      const { getCurrentUser } = await import("@/lib/auth/session");
      const fakeRequest = new Request("http://localhost/api/admin/test", { method: "POST" });
      const fakeContext = { params: { id: "11111111-1111-1111-1111-111111111111" } };

      const mod = await import(/* @vite-ignore */ filePath);
      const exportedMethods = HTTP_METHODS.filter((m) => typeof mod[m] === "function");
      expect(exportedMethods.length).toBeGreaterThan(0);

      for (const method of exportedMethods) {
        vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
        const anonRes = await mod[method](fakeRequest, fakeContext);
        expect(anonRes.status, `${method} ${_label}: anonymous caller`).toBe(401);

        vi.mocked(getCurrentUser).mockResolvedValueOnce({
          id: "22222222-2222-2222-2222-222222222222",
          isAdmin: false,
          email: "member@example.com",
        } as Awaited<ReturnType<typeof getCurrentUser>>);
        const memberRes = await mod[method](fakeRequest, fakeContext);
        expect(memberRes.status, `${method} ${_label}: authenticated non-admin caller`).toBe(403);
      }
    },
  );
});
