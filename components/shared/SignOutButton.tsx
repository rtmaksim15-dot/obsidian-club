"use client";

import { useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  // "quiet" (Navigation v2 fix pass, item 9, 2026-10-11, see
  // DECISIONS.md) — MineMenu moved sign-out off the header row (which
  // now only has "View my profile") down to the bottom of the menu, as
  // a quiet text link labeled "Leave" rather than a danger button. The
  // confirm step is unchanged — only the trigger's own look+label
  // differ; every other call site (`/hall`, `/profile/edit`,
  // `/ritual/layout.tsx`, `/antechamber`) keeps the original button.
  variant?: "button" | "quiet";
};

// Bottom of /hall (Sign Out, 2026-08-08) — a plain <form method="POST">
// to /api/auth/sign-out. Confirms first (2026-09-30, see DECISIONS.md)
// — now that every button looks the same, a dangerous one needs its
// own "are you sure" rather than standing out by color/weight.
export default function SignOutButton({ variant = "button" }: Props) {
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action="/api/auth/sign-out" method="POST">
        {variant === "quiet" ? (
          <button
            type="button"
            className="nav-control text-caption"
            style={{ color: "var(--color-text-muted)" }}
            onClick={() => setConfirming(true)}
          >
            Leave
          </button>
        ) : (
          <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
            Sign out
          </button>
        )}
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
