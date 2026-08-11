"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import RegistrationConsentFields from "./RegistrationConsentFields";

// One-time interstitial for members whose LegalConsent row predates the
// current document versions (Block 4, 2026-08-10) — same three
// checkboxes as registration, same server-side re-check pattern.
export default function ReconsentForm() {
  const router = useRouter();
  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [aupChecked, setAupChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consentGiven = ageChecked && termsChecked && aupChecked;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!consentGiven) {
      setError("Please check all three boxes to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/legal/reconsent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageConfirmed: ageChecked,
          termsAccepted: termsChecked,
          aupAccepted: aupChecked,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error ?? "Could not record your acceptance.");
        setSubmitting(false);
        return;
      }
      router.push("/feed");
      router.refresh();
    } catch {
      setError("Could not record your acceptance.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 w-full max-w-sm space-y-5" noValidate>
      <RegistrationConsentFields
        ageChecked={ageChecked}
        onAgeChange={setAgeChecked}
        termsChecked={termsChecked}
        onTermsChange={setTermsChecked}
        aupChecked={aupChecked}
        onAupChange={setAupChecked}
      />

      {error ? (
        <p className="text-caption" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={submitting || !consentGiven}>
        {submitting ? "Continuing…" : "Continue"}
      </button>
    </form>
  );
}
