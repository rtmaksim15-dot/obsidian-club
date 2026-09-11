"use client";

import { useState } from "react";
import type { Person } from "./AdminConsole";
import { levelName } from "@/lib/rating/levels";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
}

function formatDay(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

// Zone 2 full depth (2026-09-11, see DECISIONS.md — reconstruction
// pending). Reuses the existing PATCH /api/admin/members/[id] action
// route unchanged for the ageVerified toggle -- components/shared/
// MembersAgeVerification.tsx had this logic already, same
// orphaned-since-the-fold shape ApplicationsQueue.tsx was for Zone 1.
// RepHistory/LegalConsent/ModerationAction sections show real history
// fetched server-side; toggling ageVerified here only patches the
// current-state fields optimistically (the route doesn't echo a new
// ModerationAction row, and this component has no admin identity to
// fabricate one with) -- the admin-actions log below reflects the
// toggle on the next full page load, same honesty tradeoff Zone 1 made
// for its own current-state-only fields.
export default function PersonDetail({
  person,
  onUpdate,
}: {
  person: Person;
  onUpdate: (id: string, patch: Partial<Person>) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notePending, setNotePending] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  async function addNote() {
    const text = noteDraft.trim();
    if (!text) return;
    setNotePending(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/admin/members/${person.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      onUpdate(person.id, { notes: [json.note, ...person.notes] });
      setNoteDraft("");
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setNotePending(false);
    }
  }

  async function toggleAgeVerified() {
    const next = !person.ageVerified;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ageVerified: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Something went wrong.");
      onUpdate(person.id, { ageVerified: next, ageVerifiedAt: next ? new Date().toISOString() : null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <p className="text-h2 !text-base">{person.displayName}</p>
      <p className="text-data mt-1">{person.email}</p>
      <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
        @{person.username}
        {person.joinedAt ? ` · Joined ${formatDay(person.joinedAt)}` : ""}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-ob-border pt-4 sm:grid-cols-3">
        <div>
          <p className="text-label">REP</p>
          <p className="text-data mt-1">{person.rep}</p>
        </div>
        <div>
          <p className="text-label">Level</p>
          <p className="text-data mt-1">{levelName(person.level)}</p>
        </div>
        <div>
          <p className="text-label">Trust Score</p>
          <p className="text-data mt-1">{person.trustScore}</p>
        </div>
      </div>
      <p className="text-caption mt-3" style={{ color: "var(--color-text-secondary)" }}>
        {person.postCount} {person.postCount === 1 ? "post" : "posts"} · {person.commentCount}{" "}
        {person.commentCount === 1 ? "comment" : "comments"} · Reputation {person.reputation.toFixed(1)} ★
      </p>

      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">Age Verification</p>
        <p className="text-data">
          {person.ageVerified ? `Verified${person.ageVerifiedAt ? ` — ${formatDate(person.ageVerifiedAt)}` : ""}` : "Not verified"}
        </p>
        <button type="button" className="btn-secondary mt-3" disabled={pending} onClick={toggleAgeVerified}>
          {pending ? "…" : person.ageVerified ? "Remove age verification" : "Mark age-verified"}
        </button>
        {error ? (
          <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
            {error}
          </p>
        ) : null}
      </div>

      {person.invitedByName || person.inviteeNames.length > 0 || person.partnerName ? (
        <div className="mt-6 border-t border-ob-border pt-4">
          <p className="text-label mb-2">Connections</p>
          {person.invitedByName ? <p className="text-caption">Invited by {person.invitedByName}</p> : null}
          {person.inviteeNames.length > 0 ? (
            <p className="text-caption mt-1">Invited: {person.inviteeNames.join(", ")}</p>
          ) : null}
          {person.partnerName ? <p className="text-caption mt-1">Partner of {person.partnerName}</p> : null}
        </div>
      ) : null}

      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">REP History</p>
        {person.repHistory.length === 0 ? (
          <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
            No changes yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {person.repHistory.map((h) => (
              <li key={h.id} className="text-caption flex items-center justify-between">
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {h.reason ?? h.source ?? "REP event"} · {formatDay(h.createdAt)}
                </span>
                <span style={{ color: h.delta >= 0 ? "var(--color-success)" : "var(--color-error)" }}>
                  {h.delta >= 0 ? `+${h.delta}` : h.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">Legal Consent</p>
        {person.consents.length === 0 ? (
          <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
            No consent recorded.
          </p>
        ) : (
          <ul className="space-y-2">
            {person.consents.map((c) => (
              <li key={c.id} className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                {formatDate(c.acceptedAt)} — Terms {c.termsVersion}, Privacy {c.privacyVersion}, AUP {c.aupVersion}
                {c.acceptedIp ? ` (${c.acceptedIp})` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">Admin Actions on This Member</p>
        {person.adminActions.length === 0 ? (
          <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
            None recorded.
          </p>
        ) : (
          <ul className="space-y-2">
            {person.adminActions.map((m) => (
              <li key={m.id} className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                {formatDate(m.createdAt)} — {m.action}
                {m.adminName ? ` by ${m.adminName}` : ""}
                {m.note ? `: ${m.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-6 border-t border-ob-border pt-4">
        <p className="text-label mb-2">Notes</p>
        {person.notes.length === 0 ? (
          <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
            No notes yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {person.notes.map((n) => (
              <li key={n.id} className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {formatDate(n.createdAt)}
                  {n.authorName ? ` — ${n.authorName}` : ""}
                </span>
                <p className="text-body !text-sm mt-1" style={{ color: "var(--color-text-primary)" }}>
                  {n.body}
                </p>
              </li>
            ))}
          </ul>
        )}
        <textarea
          className="input mt-4 w-full"
          rows={3}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Add a note about this member…"
        />
        <button type="button" className="btn-secondary mt-2" disabled={!noteDraft.trim() || notePending} onClick={addNote}>
          {notePending ? "…" : "Add Note"}
        </button>
        {noteError ? (
          <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
            {noteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
