"use client";

import { useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

// Immediate, self-service account closure — no explanation or approval
// needed (member protection mechanics, pre-launch legal package,
// 2026-08-09). Confirms via ConfirmDialog.tsx now (2026-09-30, see
// DECISIONS.md) instead of window.confirm() — same reasoning as
// SignOutButton: every button looks identical now, so this one's
// extra step is what signals "irreversible," not its color.
export default function CloseAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action="/api/account/close" method="POST">
        <button type="button" className="text-caption" style={{ color: "var(--color-error)" }} onClick={() => setConfirming(true)}>
          Close my account
        </button>
      </form>
      {confirming ? (
        <ConfirmDialog
          title="Close your account? You'll be signed out and your profile will no longer be visible to other members."
          confirmLabel="Close account"
          onConfirm={() => formRef.current?.requestSubmit()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}
