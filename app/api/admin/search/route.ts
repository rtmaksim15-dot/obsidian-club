import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdminApi } from "@/lib/auth/require-admin";
import {
  SEARCH_MAX_RESULTS,
  isSearchQueryValid,
  mergeSearchResults,
  normalizeSearchQuery,
  type AdminSearchResult,
} from "@/lib/admin/search";

// GET /api/admin/search?q=<term> (2026-11-22, see DECISIONS.md) — a
// real, server-side, full-table search across both applicants
// (Waitlist, every status) and members (User, every status — fixed
// 2026-11-22: originally filtered to status: "active", which made an
// inactive/banned member invisible to this search entirely, not just
// unlabeled, the actual cause of @hfjhgfhfffjnkn_ ("Тома2," member
// #0004, status "inactive") not being findable. isTest is returned so
// the UI can still visually flag a test account once found — the only
// label this route should apply; status filtering itself is not how
// that distinction belongs made). Matching itself is Prisma's
// `contains` with `mode: "insensitive"` — compiles to a parameterized
// ILIKE, never string-concatenated SQL. Min 2 chars / max 20 combined
// results are enforced by lib/admin/search.ts, shared with the
// client's own debounce guard. No search term or result is ever
// logged (CLAUDE.md rule 12, extended to PII by the 2026-11-21
// invite-list task — same posture here: a name/email typed into this
// box is exactly that kind of PII).
export async function GET(request: Request) {
  const adminResult = await requireAdminApi();
  if (!adminResult.ok) {
    return adminResult.response;
  }

  const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
  const query = normalizeSearchQuery(rawQuery);
  if (!isSearchQueryValid(query)) {
    return NextResponse.json({ results: [] satisfies AdminSearchResult[] });
  }

  const [applicantRows, memberRows] = await Promise.all([
    prisma.waitlist.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: SEARCH_MAX_RESULTS,
      select: { id: true, name: true, email: true, status: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { joinedAt: "desc" },
      take: SEARCH_MAX_RESULTS,
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        isTest: true,
      },
    }),
  ]);

  const applicantResults: AdminSearchResult[] = applicantRows.map((a) => ({
    id: a.id,
    type: "applicant",
    displayName: a.name || a.email,
    handle: null,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
  }));

  const memberResults: AdminSearchResult[] = memberRows.map((m) => ({
    id: m.id,
    type: "member",
    displayName: m.displayName,
    handle: m.username,
    status: m.status,
    createdAt: (m.joinedAt ?? m.createdAt).toISOString(),
    isTest: m.isTest,
  }));

  return NextResponse.json({ results: mergeSearchResults(applicantResults, memberResults) });
}
