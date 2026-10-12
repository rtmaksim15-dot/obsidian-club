// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — pure state
// machine for the "A new version is ready." bar, pulled out of
// PwaUpdateManager.tsx so the three states (no SW waiting / waiting /
// mid-reload) and their transitions are unit-testable without a real
// ServiceWorkerRegistration.
export type UpdateBarState = "none" | "waiting" | "reloading";

export type UpdateBarEvent = "waiting_detected" | "refresh_clicked" | "controller_changed";

export function nextUpdateBarState(state: UpdateBarState, event: UpdateBarEvent): UpdateBarState {
  // Once a refresh has been requested, the bar stays in "reloading"
  // until the page actually reloads — a late "waiting_detected" (e.g.
  // the registration's updatefound firing again) shouldn't flip the UI
  // back to an actionable "waiting" state mid-reload.
  if (state === "reloading") return "reloading";

  if (event === "waiting_detected") return "waiting";
  if (event === "refresh_clicked") return state === "waiting" ? "reloading" : state;
  return state;
}
