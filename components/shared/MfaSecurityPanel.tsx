"use client";

import { useEffect, useState } from "react";

type Factor = { id: string; friendlyName: string | null; status: string; createdAt: string };
type EnrollState = { factorId: string; qrCode: string; secret: string } | null;

// Item 2, 2026-09-17 — self-service TOTP enrollment/management for the
// admin account. Deliberately reachable at aal1 (see the page this
// mounts on): an admin with no factor yet has nothing to step up from.
export default function MfaSecurityPanel() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadFactors() {
    const res = await fetch("/api/auth/mfa/factors");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setFactors(body.factors);
  }

  useEffect(() => {
    loadFactors();
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Could not start enrollment.");
      return;
    }
    setEnrolling({ factorId: body.factorId, qrCode: body.qrCode, secret: body.secret });
  }

  async function confirmEnroll(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId: enrolling.factorId, code }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Incorrect code.");
      return;
    }
    setEnrolling(null);
    setCode("");
    setNotice("Two-factor authentication is enabled.");
    await loadFactors();
  }

  async function removeFactor(factorId: string) {
    if (!window.confirm("Remove this authenticator? You'll need to set up a new one to sign in as admin again.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/mfa/unenroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factorId }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Could not remove.");
      return;
    }
    setNotice("Removed.");
    await loadFactors();
  }

  if (factors === null) {
    return <p className="text-body">Loading…</p>;
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");

  return (
    <div>
      {notice ? (
        <p className="text-caption mb-4" style={{ color: "var(--color-success)" }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-caption mb-4" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      {verifiedFactors.length > 0 ? (
        <section className="mb-10">
          <p className="text-label mb-3">Enrolled Authenticators</p>
          <ul className="space-y-3">
            {verifiedFactors.map((f) => (
              <li key={f.id} className="card flex items-center justify-between">
                <span className="text-data">
                  {f.friendlyName || "Authenticator"}
                  <span className="text-caption ml-2" style={{ color: "var(--color-text-muted)" }}>
                    added {new Date(f.createdAt).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })}
                  </span>
                </span>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => removeFactor(f.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <p className="text-caption mt-3" style={{ color: "var(--color-text-secondary)" }}>
            A second authenticator on a different device is worth having as a backup — add one below.
          </p>
        </section>
      ) : (
        <p className="text-body mb-6">No authenticator set up yet. Admin sign-in requires one.</p>
      )}

      {enrolling ? (
        <form onSubmit={confirmEnroll} className="card">
          <p className="text-label mb-3">Scan This Code</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="TOTP QR code" className="mb-4 h-48 w-48" />
          <p className="text-caption mb-1" style={{ color: "var(--color-text-secondary)" }}>
            Can&apos;t scan it? Enter this key manually:
          </p>
          <p className="text-data mb-4 break-all">{enrolling.secret}</p>
          <label htmlFor="mfa-code" className="input-label">
            6-digit code from your authenticator app
          </label>
          <input
            id="mfa-code"
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            autoFocus
          />
          <div className="mt-4 flex gap-3">
            <button type="submit" className="btn-primary" disabled={busy || code.length < 6}>
              {busy ? "…" : "Confirm"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              onClick={() => {
                setEnrolling(null);
                setCode("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-primary" disabled={busy} onClick={startEnroll}>
          {verifiedFactors.length > 0 ? "Add Another Authenticator" : "Set Up Two-Factor Authentication"}
        </button>
      )}
    </div>
  );
}
