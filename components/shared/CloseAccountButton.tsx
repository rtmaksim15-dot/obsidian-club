"use client";

// Immediate, self-service account closure — no explanation or approval
// needed (member protection mechanics, pre-launch legal package,
// 2026-08-09). Same zero-JS-required <form method="POST"> as
// SignOutButton; the only JS here is the confirm() guard, since this
// one's destructive enough to warrant a pause first.
export default function CloseAccountButton() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm("Close your account?\n\nYou'll be signed out and your profile will no longer be visible to other members.")) {
      e.preventDefault();
    }
  }

  return (
    <form action="/api/account/close" method="POST" onSubmit={handleSubmit}>
      <button type="submit" className="text-caption" style={{ color: "var(--color-error)" }}>
        Close my account
      </button>
    </form>
  );
}
