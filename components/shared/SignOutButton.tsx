"use client";

import { useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

// Bottom of /hall (Sign Out, 2026-08-08) — a plain <form method="POST">
// to /api/auth/sign-out. Confirms first (2026-09-30, see DECISIONS.md)
// — now that every button looks the same, a dangerous one needs its
// own "are you sure" rather than standing out by color/weight.
export default function SignOutButton() {
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action="/api/auth/sign-out" method="POST">
        <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
          Sign out
        </button>
      </form>
      {confirming ? (
        <ConfirmDialog
          title="Sign out?"
          confirmLabel="Sign out"
          onConfirm={() => formRef.current?.requestSubmit()}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </>
  );
}
