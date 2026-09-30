// Bottom of /hall (Sign Out, 2026-08-08) — a plain <form method="POST">
// to /api/auth/sign-out, no client JS needed. Styled as `btn-danger`
// (2026-09-29, see DECISIONS.md, explicit call — ends the session,
// grouped with the club's other irreversible/dangerous actions) rather
// than the quiet `btn-ghost` it used before.
export default function SignOutButton() {
  return (
    <form action="/api/auth/sign-out" method="POST">
      <button type="submit" className="btn-danger">
        Sign out
      </button>
    </form>
  );
}
