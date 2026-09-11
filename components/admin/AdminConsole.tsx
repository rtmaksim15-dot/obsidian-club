"use client";

import { useEffect, useState } from "react";
import DetailPanel from "./DetailPanel";

type Zone = "applications" | "people" | "arbitration" | "invitations";

const ZONES: { id: Zone; label: string }[] = [
  { id: "applications", label: "Applications" },
  { id: "people", label: "People" },
  { id: "arbitration", label: "Arbitration" },
  { id: "invitations", label: "Invitations" },
];

type Application = { id: string; name: string | null; email: string; status: string; createdAt: string };
type Person = { id: string; displayName: string; email: string; rep: number; level: number };
type ReportRow = { id: string; targetType: string; category: string; createdAt: string };
type TokenRow = { id: string; source: string; status: string; createdAt: string };

type Props = {
  applications: Application[];
  people: Person[];
  reports: ReportRow[];
  tokens: TokenRow[];
};

// Admin Console shell (2026-09-09, see DECISIONS.md) — "one route, one
// screen": zones switch via plain component state, never a navigation,
// so nothing here ever triggers a page load. `openId` is the ONE piece
// of state that decides whether the detail panel is showing, keyed by
// whichever zone is active when it was opened — switching zones with a
// panel open just closes it (there's no cross-zone panel identity to
// preserve). A single Escape listener lives here, not per-zone, so it
// always works regardless of which zone's content is on screen.
export default function AdminConsole({ applications, people, reports, tokens }: Props) {
  const [zone, setZone] = useState<Zone>("applications");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function switchZone(next: Zone) {
    setZone(next);
    setOpenId(null);
  }

  const currentList =
    zone === "applications" ? applications : zone === "people" ? people : zone === "arbitration" ? reports : tokens;

  const openApplication = zone === "applications" ? applications.find((a) => a.id === openId) : undefined;
  const openPerson = zone === "people" ? people.find((p) => p.id === openId) : undefined;
  const openReport = zone === "arbitration" ? reports.find((r) => r.id === openId) : undefined;
  const openToken = zone === "invitations" ? tokens.find((t) => t.id === openId) : undefined;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-10 text-ob-text">
      <div className="mx-auto max-w-4xl">
        <p className="text-label mb-6">Admin Console</p>

        {/* Status bar lands in the next step — placeholder row for now
            so the shell's vertical rhythm is already correct. */}
        <div className="card mb-6 flex flex-wrap gap-6" style={{ opacity: 0.5 }}>
          <p className="text-caption">Status bar — next step</p>
        </div>

        <div className="mb-6 flex gap-2 border-b border-ob-border">
          {ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => switchZone(z.id)}
              className="px-4 py-2 text-caption"
              style={{
                color: zone === z.id ? "var(--color-text-primary)" : "var(--color-text-muted)",
                borderBottom: zone === z.id ? "2px solid var(--color-accent)" : "2px solid transparent",
              }}
            >
              {z.label}
            </button>
          ))}
        </div>

        {currentList.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            Nothing here.
          </p>
        ) : (
          <ul className="space-y-2">
            {zone === "applications" &&
              applications.map((a) => (
                <li
                  key={a.id}
                  className="card cursor-pointer"
                  onClick={() => setOpenId(a.id)}
                >
                  <p className="text-data">{a.name || a.email}</p>
                  <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                    {a.status}
                  </p>
                </li>
              ))}
            {zone === "people" &&
              people.map((p) => (
                <li key={p.id} className="card cursor-pointer" onClick={() => setOpenId(p.id)}>
                  <p className="text-data">{p.displayName}</p>
                  <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                    REP {p.rep} · Level {p.level}
                  </p>
                </li>
              ))}
            {zone === "arbitration" &&
              reports.map((r) => (
                <li key={r.id} className="card cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <p className="text-data">
                    {r.targetType} — {r.category}
                  </p>
                </li>
              ))}
            {zone === "invitations" &&
              tokens.map((t) => (
                <li key={t.id} className="card cursor-pointer" onClick={() => setOpenId(t.id)}>
                  <p className="text-data">
                    {t.source} — {t.status}
                  </p>
                </li>
              ))}
          </ul>
        )}
      </div>

      {openId ? (
        <DetailPanel onClose={() => setOpenId(null)}>
          {openApplication ? (
            <div>
              <p className="text-h2 !text-base">{openApplication.name || "(no name given)"}</p>
              <p className="text-data mt-1">{openApplication.email}</p>
              <p className="text-caption mt-2">Status: {openApplication.status}</p>
            </div>
          ) : null}
          {openPerson ? (
            <div>
              <p className="text-h2 !text-base">{openPerson.displayName}</p>
              <p className="text-data mt-1">{openPerson.email}</p>
              <p className="text-caption mt-2">
                REP {openPerson.rep} · Level {openPerson.level}
              </p>
            </div>
          ) : null}
          {openReport ? (
            <div>
              <p className="text-h2 !text-base">
                {openReport.targetType} report — {openReport.category}
              </p>
            </div>
          ) : null}
          {openToken ? (
            <div>
              <p className="text-h2 !text-base">
                {openToken.source} — {openToken.status}
              </p>
            </div>
          ) : null}
        </DetailPanel>
      ) : null}
    </main>
  );
}
