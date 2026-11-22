"use client";

import { useEffect, useRef, useState } from "react";
import { isSearchQueryValid, normalizeSearchQuery, type AdminSearchResult } from "@/lib/admin/search";
import { formatAdminDateTime } from "@/lib/admin/format-date";

// Admin search (2026-11-22, see DECISIONS.md) — one search box at the
// top of the console, searching applicants (Waitlist) and members
// (User) together via GET /api/admin/search. Debounced (300ms);
// below the 2-char minimum it just clears the dropdown rather than
// hitting the route at all. Selecting a result is the caller's job
// (AdminConsole#handleSearchSelect) — this component only reports
// which one was picked and clears itself.
export default function AdminSearch({ onSelect }: { onSelect: (result: AdminSearchResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const normalized = normalizeSearchQuery(query);
    if (!isSearchQueryValid(normalized)) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(normalized)}`);
        const json = await res.json();
        setResults(res.ok ? json.results ?? [] : []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative mb-6">
      <input
        className="input w-full"
        placeholder="Search applicants and members by name, handle, or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        // A click on a result button fires blur first; the short delay
        // lets that click's onClick still run before the dropdown
        // disappears out from under it.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open ? (
        <div
          className="absolute z-20 mt-1 max-h-96 w-full overflow-y-auto rounded-ob border bg-ob-black"
          style={{ borderColor: "var(--color-border)" }}
        >
          {loading ? (
            <p className="text-caption px-3 py-2" style={{ color: "var(--color-text-muted)" }}>
              Searching…
            </p>
          ) : results.length === 0 ? (
            <p className="text-caption px-3 py-2" style={{ color: "var(--color-text-secondary)" }}>
              No one by that name.
            </p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left"
                    style={{ borderBottom: "1px solid var(--color-border)" }}
                    onClick={() => {
                      onSelect(r);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <p className="text-data">
                      {r.displayName}
                      {r.handle ? (
                        <span className="text-caption ml-1" style={{ color: "var(--color-text-muted)" }}>
                          @{r.handle}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-caption mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {r.type === "applicant" ? "Applicant" : "Member"} · {r.status} · {formatAdminDateTime(r.createdAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
