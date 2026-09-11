"use client";

import { useEffect, useState } from "react";
import DetailPanel from "./DetailPanel";
import StatusBar, { type Counts } from "./StatusBar";
import ApplicationDetail from "./ApplicationDetail";
import PersonDetail from "./PersonDetail";
import ReportDetail from "./ReportDetail";
import TokenDetail from "./TokenDetail";
import CreatePersonalInvite from "./CreatePersonalInvite";
import { levelName } from "@/lib/rating/levels";

export type Zone = "applications" | "people" | "arbitration" | "invitations";
export type Filter = "pending" | "held" | "failedSend" | "notAgeVerified" | null;

const ZONES: { id: Zone; label: string }[] = [
  { id: "applications", label: "Applications" },
  { id: "people", label: "People" },
  { id: "arbitration", label: "Arbitration" },
  { id: "invitations", label: "Invitations" },
];

const FILTER_LABELS: Record<Exclude<Filter, null>, string> = {
  pending: "New Applications",
  held: "On Hold",
  failedSend: "Failed Sends",
  notAgeVerified: "Not Age-Verified",
};

// Zone 1 full depth (2026-09-10) — everything the review action route
// (PATCH /api/admin/applications/[id]) reads or writes, plus what the
// old ApplicationsQueue.tsx card showed. reviewerName is resolved
// server-side (reviewedBy is a raw User.id, no Prisma relation).
// hasToken stands in for applicationTokenId's mere existence — the
// token/URL itself is never sent to the client, by the same rule A7
// already established for the old queue.
export type Application = {
  id: string;
  name: string | null;
  email: string;
  age: number | null;
  city: string | null;
  source: string | null;
  reason: string | null;
  referralCode: string | null;
  origin: string | null;
  status: string;
  createdAt: string;
  heldReason: string | null;
  heldNote: string | null;
  heldAt: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  ageVerified: boolean;
  ageVerifiedAt: string | null;
  hasToken: boolean;
  decisionEmailSentAt: string | null;
  decisionEmailSendError: string | null;
};
// Zone 2 full depth (2026-09-11) — REP/level (+RepHistory), post/
// comment counts, invited-by/invited-whom/partner, LegalConsent history
// (real history here, unlike Zone 1's Waitlist rows — see admin/page.tsx),
// and every ModerationAction ever logged against this specific member
// (targetType "user"). No ban/promote/role/inviteAllowance fields —
// those admin actions don't exist as endpoints yet.
export type Person = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  rep: number;
  level: number;
  trustScore: number;
  reputation: number;
  ageVerified: boolean;
  ageVerifiedAt: string | null;
  joinedAt: string | null;
  postCount: number;
  commentCount: number;
  invitedByName: string | null;
  inviteeNames: string[];
  partnerName: string | null;
  repHistory: { id: string; delta: number; reason: string | null; source: string | null; createdAt: string }[];
  consents: { id: string; termsVersion: string; privacyVersion: string; aupVersion: string; acceptedAt: string; acceptedIp: string | null }[];
  adminActions: { id: string; action: string; note: string | null; createdAt: string; adminName: string | null }[];
  notes: { id: string; body: string; createdAt: string; authorName: string | null }[];
};
// Zone 3 full depth (2026-09-11) — side-by-side reporter/reported,
// resolved server-side per targetType since Report.targetId has no
// Prisma relation (see admin/page.tsx). "Full history" is three
// independent things, all shown: siblingReports (other reports, any
// status, against this exact target), targetModerationActions (every
// admin action ever logged against this target, not just this report's
// own resolution), and the reporter's own filing stats.
export type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  category: string;
  isRedLine: boolean;
  note: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewerName: string | null;
  reporter: {
    id: string;
    displayName: string;
    username: string;
    level: number;
    trustScore: number;
    ageVerified: boolean;
    joinedAt: string | null;
    reportsFiled: number;
    reportsDismissed: number;
  };
  target: {
    label: string;
    authorId: string | null;
    authorName: string | null;
    authorUsername: string | null;
    isDeleted: boolean;
    isPreserved: boolean;
    contextHref: string | null;
  };
  siblingReports: { id: string; status: string; category: string; createdAt: string }[];
  targetModerationActions: { id: string; action: string; note: string | null; createdAt: string; adminName: string | null }[];
};
// Zone 4 full depth (2026-09-11) — "issued/redeemed/expired" is bucketed
// server-side from evaluateTokenLifecycle(), never the possibly-stale
// `status` column (nothing in this codebase ever writes
// InviteTokenStatus.expired). Failed sends are sorted first, per
// instruction. redeemedByName/inviterName/partnerOfName are resolved
// server-side (all three are raw User.id fields, no Prisma relation on
// the client's shape).
export type TokenRow = {
  id: string;
  source: string;
  status: string;
  bucket: "issued" | "redeemed" | "expired" | "revoked";
  createdAt: string;
  validUntil: string | null;
  revokedAt: string | null;
  redeemedAt: string | null;
  redeemedByName: string | null;
  inviterName: string | null;
  partnerOfName: string | null;
  sentToEmail: string | null;
  sentToName: string | null;
  emailSentAt: string | null;
  emailSendError: string | null;
};

type Props = {
  counts: Counts;
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
//
// Status bar (2026-09-10): `filter` narrows whichever zone's list is
// showing to one of the status bar's six counts. Switching zones via
// the tabs clears it (a plain tab click means "show me everything in
// this zone"); clicking a status bar number sets zone + filter
// together and always wins over whatever tab was previously active.
//
// Zone 1 (2026-09-10): `applications` is now local state, not a bare
// prop — Accept/Hold/Decline/Resend mutate a row in place via
// `updateApplication` so the list and the open panel both reflect the
// result immediately, without a full page reload. Declining closes the
// panel (nothing further to do); approving/holding leaves it open to
// show the updated state. Rows are never removed from state on
// decision — the existing `filter` logic already hides a row from the
// default view once its status moves past pending/held, while still
// surfacing it under "Failed Sends" if it has a send error, decided or
// not (see Step 2 commit for why that has to be true).
export default function AdminConsole({ counts, applications: initialApplications, people: initialPeople, reports: initialReports, tokens: initialTokens }: Props) {
  const [applications, setApplications] = useState(initialApplications);
  const [people, setPeople] = useState(initialPeople);
  const [reports, setReports] = useState(initialReports);
  const [tokens, setTokens] = useState(initialTokens);
  const [zone, setZone] = useState<Zone>("applications");
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function switchZone(next: Zone) {
    setZone(next);
    setFilter(null);
    setOpenId(null);
  }

  function selectStat(nextZone: Zone, nextFilter: Filter) {
    setZone(nextZone);
    setFilter(nextFilter);
    setOpenId(null);
  }

  function updateApplication(id: string, patch: Partial<Application>) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function updatePerson(id: string, patch: Partial<Person>) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function updateReport(id: string, patch: Partial<ReportRow>) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function updateToken(id: string, patch: Partial<TokenRow>) {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addToken(token: TokenRow) {
    setTokens((prev) => [token, ...prev]);
  }

  const visibleApplications = applications.filter((a) => {
    if (filter === "pending") return a.status === "pending";
    if (filter === "held") return a.status === "held";
    if (filter === "failedSend") return a.decisionEmailSendError !== null;
    return a.status === "pending" || a.status === "held";
  });
  const visiblePeople = filter === "notAgeVerified" ? people.filter((p) => !p.ageVerified) : people;
  // Every action on a report is terminal (the route 422s on a
  // non-"open" report — it can never be re-acted on), so a resolved row
  // simply drops out of view, same "filter hides it once decided"
  // pattern Zone 1 uses for its own pending/held default.
  const visibleReports = reports.filter((r) => r.status === "open");

  const currentList =
    zone === "applications"
      ? visibleApplications
      : zone === "people"
        ? visiblePeople
        : zone === "arbitration"
          ? visibleReports
          : tokens;

  const openApplication = zone === "applications" ? applications.find((a) => a.id === openId) : undefined;
  const openPerson = zone === "people" ? people.find((p) => p.id === openId) : undefined;
  const openReport = zone === "arbitration" ? reports.find((r) => r.id === openId) : undefined;
  const openToken = zone === "invitations" ? tokens.find((t) => t.id === openId) : undefined;

  return (
    <main className="min-h-screen bg-ob-black px-6 py-10 text-ob-text">
      <div className="mx-auto max-w-4xl">
        <p className="text-label mb-6">Admin Console</p>

        <StatusBar counts={counts} onSelect={selectStat} />

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

        {filter ? (
          <button
            type="button"
            onClick={() => setFilter(null)}
            className="text-caption mb-4 inline-flex items-center gap-2 rounded-ob border px-3 py-1.5"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            Showing: {FILTER_LABELS[filter]} <span aria-hidden="true">×</span>
          </button>
        ) : null}

        {zone === "invitations" ? <CreatePersonalInvite onCreated={addToken} /> : null}

        {currentList.length === 0 ? (
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            Nothing here.
          </p>
        ) : (
          <ul className="space-y-2">
            {zone === "applications" &&
              visibleApplications.map((a) => (
                <li
                  key={a.id}
                  className="card cursor-pointer"
                  onClick={() => setOpenId(a.id)}
                >
                  <p className="text-data">{a.name || a.email}</p>
                  <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                    {a.status}
                  </p>
                  {a.decisionEmailSendError ? (
                    <p className="text-caption mt-1 font-semibold" style={{ color: "var(--color-error)" }}>
                      Send failed — {a.decisionEmailSendError}
                    </p>
                  ) : null}
                </li>
              ))}
            {zone === "people" &&
              visiblePeople.map((p) => (
                <li key={p.id} className="card cursor-pointer" onClick={() => setOpenId(p.id)}>
                  <p className="text-data">{p.displayName}</p>
                  <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                    REP {p.rep} · {levelName(p.level)} · {p.ageVerified ? "Age-verified" : "Not age-verified"}
                  </p>
                </li>
              ))}
            {zone === "arbitration" &&
              visibleReports.map((r) => (
                <li key={r.id} className="card cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <p className="text-data">{r.target.label}</p>
                  <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                    {r.targetType} · {r.category} · reported by {r.reporter.displayName}
                  </p>
                  {r.isRedLine ? (
                    <p className="text-caption mt-1 font-semibold" style={{ color: "var(--color-error)" }}>
                      Red line
                    </p>
                  ) : null}
                </li>
              ))}
            {zone === "invitations" &&
              tokens.map((t) => (
                <li key={t.id} className="card cursor-pointer" onClick={() => setOpenId(t.id)}>
                  <p className="text-data">{t.sentToEmail ?? t.source}</p>
                  <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                    {t.source} · {t.bucket}
                  </p>
                  {t.sentToEmail && !t.emailSentAt ? (
                    <p className="text-caption mt-1 font-semibold" style={{ color: "var(--color-error)" }}>
                      Send failed{t.emailSendError ? ` — ${t.emailSendError}` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </div>

      {openId ? (
        <DetailPanel onClose={() => setOpenId(null)}>
          {openApplication ? (
            <ApplicationDetail application={openApplication} onUpdate={updateApplication} onClose={() => setOpenId(null)} />
          ) : null}
          {openPerson ? <PersonDetail person={openPerson} onUpdate={updatePerson} /> : null}
          {openReport ? (
            <ReportDetail report={openReport} onUpdate={updateReport} onClose={() => setOpenId(null)} />
          ) : null}
          {openToken ? <TokenDetail token={openToken} onUpdate={updateToken} /> : null}
        </DetailPanel>
      ) : null}
    </main>
  );
}
