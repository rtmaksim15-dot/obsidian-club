"use client";

import { useState } from "react";
import type { BoundariesSettings, WhoCanMessage } from "@/lib/dm/boundaries";

const WHO_CAN_MESSAGE_OPTIONS: { value: WhoCanMessage; label: string }[] = [
  { value: "members", label: "All members — their first message waits in Requests" },
  { value: "following", label: "Only those I follow" },
  { value: "nobody_new", label: "No one new" },
];

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-body">{label}</p>
        <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
          {hint}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onToggle}
        className="nav-control relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: checked ? "var(--color-accent)" : "var(--color-border)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}

// My Boundaries (Package 4, Phase A, 2026-10-13, see DECISIONS.md) — A4.
// Saves on every change (same pattern as MineMenu's Veil toggle), not a
// single "Save" button at the bottom — each control is independently
// meaningful and there's nothing to lose by committing immediately.
export default function BoundariesForm({ initial }: { initial: BoundariesSettings }) {
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Partial<BoundariesSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/boundaries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Could not save.");
        setSettings(settings);
      }
    } catch {
      setError("Could not save.");
      setSettings(settings);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {error ? (
        <p className="text-caption mb-4" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      ) : null}

      <div className="border-t border-ob-border pt-4">
        <label className="input-label" htmlFor="who-can-message">
          Who may write to me first
        </label>
        <select
          id="who-can-message"
          className="input mt-2"
          value={settings.whoCanMessage}
          disabled={pending}
          onChange={(e) => save({ whoCanMessage: e.target.value as WhoCanMessage })}
        >
          {WHO_CAN_MESSAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 divide-y divide-ob-border border-t border-ob-border">
        <ToggleRow
          label="Show my city on my profile"
          hint="Off by default — your city stays private until you turn this on."
          checked={settings.showCity}
          disabled={pending}
          onToggle={() => save({ showCity: !settings.showCity })}
        />
        <ToggleRow
          label="Accept new requests"
          hint="Turn off to pause new conversations entirely, even from members you'd otherwise allow."
          checked={settings.acceptRequests}
          disabled={pending}
          onToggle={() => save({ acceptRequests: !settings.acceptRequests })}
        />
      </div>
    </div>
  );
}
