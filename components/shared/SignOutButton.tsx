// Quiet text link at the bottom of /hall (Sign Out, 2026-08-08) — a
// plain <form method="POST"> to /api/auth/sign-out, no client JS
// needed. Styled identically to "Edit profile" further up this page
// (same btn-ghost class) so it reads as the same kind of quiet action,
// not a destructive-looking button.
export default function SignOutButton() {
  return (
    <form action="/api/auth/sign-out" method="POST">
      <button type="submit" className="btn-ghost">
        Sign out
      </button>
    </form>
  );
}
