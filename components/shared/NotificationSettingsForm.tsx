"use client";

import { useEffect, useState } from "react";
import type { NotificationPreferences } from "@/lib/push/preferences";
import { needsIOSInstallPrompt, urlBase64ToUint8Array } from "@/lib/push/client-support";

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

type SubscriptionState = "checking" | "subscribed" | "unsubscribed" | "unsupported";

// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — "Enable on
// this device" NEVER requests permission on mount or on any automatic
// trigger, only on this button's own click handler (the task's own
// explicit requirement). Same ToggleRow pattern BoundariesForm.tsx
// already uses — saves on every change, not a single bottom "Save."
export default function NotificationSettingsForm({
  initialPreferences,
  vapidPublicKey,
}: {
  initialPreferences: NotificationPreferences;
  vapidPublicKey: string;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [prefsPending, setPrefsPending] = useState(false);
  const [prefsError, setPrefsError] = useState<string | null>(null);

  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("checking");
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari's own non-standard property — the only reliable
      // standalone signal on that platform.
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setShowIOSPrompt(needsIOSInstallPrompt(navigator.userAgent, isStandalone));

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSubscriptionState("unsupported");
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscriptionState(sub ? "subscribed" : "unsubscribed"))
      .catch(() => setSubscriptionState("unsupported"));
  }, []);

  async function savePreferences(patch: Partial<NotificationPreferences>) {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    setPrefsPending(true);
    setPrefsError(null);
    try {
      const res = await fetch("/api/push/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPrefsError(body?.error ?? "Could not save.");
        setPreferences(preferences);
      }
    } catch {
      setPrefsError("Could not save.");
      setPreferences(preferences);
    } finally {
      setPrefsPending(false);
    }
  }

  async function handleEnable() {
    setSubscribeBusy(true);
    setSubscribeError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setSubscribeError("Notifications are blocked. Enable them in your browser's site settings to continue.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's lib.dom typing for `applicationServerKey` wants an
        // ArrayBuffer-backed view specifically; Uint8Array's own
        // generic type is broader (ArrayBufferLike, which includes
        // SharedArrayBuffer) — the actual runtime value from
        // urlBase64ToUint8Array() is always a plain ArrayBuffer.
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) {
        setSubscribeError("Could not save this device. Try again.");
        return;
      }

      setSubscriptionState("subscribed");
    } catch {
      setSubscribeError("Could not enable notifications on this device.");
    } finally {
      setSubscribeBusy(false);
    }
  }

  async function handleDisable() {
    setSubscribeBusy(true);
    setSubscribeError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscriptionState("unsubscribed");
    } catch {
      setSubscribeError("Could not turn off notifications on this device.");
    } finally {
      setSubscribeBusy(false);
    }
  }

  return (
    <div>
      {showIOSPrompt ? (
        <p className="text-body mb-6 rounded-ob border px-3 py-3" style={{ borderColor: "var(--color-border)" }}>
          On iPhone, notifications work only from the installed app. Add Obsidian Club to your Home Screen first:
          open this page in Safari, tap the Share icon, then &ldquo;Add to Home Screen.&rdquo; Open the app from
          your Home Screen afterward to enable notifications.
        </p>
      ) : null}

      {subscriptionState === "unsupported" ? (
        <p className="text-caption mb-6" style={{ color: "var(--color-text-muted)" }}>
          This browser doesn&apos;t support notifications.
        </p>
      ) : (
        <div className="mb-6">
          {subscriptionState === "subscribed" ? (
            <button type="button" className="btn-secondary" disabled={subscribeBusy} onClick={handleDisable}>
              {subscribeBusy ? "…" : "Turn off on this device"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={subscribeBusy || subscriptionState === "checking"}
              onClick={handleEnable}
            >
              {subscribeBusy ? "…" : "Enable on this device"}
            </button>
          )}
          {subscribeError ? (
            <p className="text-caption mt-2" style={{ color: "var(--color-error)" }}>
              {subscribeError}
            </p>
          ) : null}
        </div>
      )}

      {prefsError ? (
        <p className="text-caption mb-4" style={{ color: "var(--color-error)" }}>
          {prefsError}
        </p>
      ) : null}

      <div className="divide-y divide-ob-border border-t border-ob-border">
        <ToggleRow
          label="Messages & requests"
          hint="New messages and new conversation requests."
          checked={preferences.messages}
          disabled={prefsPending}
          onToggle={() => savePreferences({ messages: !preferences.messages })}
        />
        <ToggleRow
          label="Replies to my posts"
          hint="A new comment on something you posted."
          checked={preferences.replies}
          disabled={prefsPending}
          onToggle={() => savePreferences({ replies: !preferences.replies })}
        />
        <ToggleRow
          label="Word of the Lord"
          hint="Rare, occasional messages from the founder."
          checked={preferences.lordWord}
          disabled={prefsPending}
          onToggle={() => savePreferences({ lordWord: !preferences.lordWord })}
        />
      </div>

      <div className="mt-2 border-t border-ob-border">
        <ToggleRow
          label="Discreet mode"
          hint="Notifications never show names, text or images."
          checked={preferences.discreet}
          disabled={prefsPending}
          onToggle={() => savePreferences({ discreet: !preferences.discreet })}
        />
      </div>
    </div>
  );
}
