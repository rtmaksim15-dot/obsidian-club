/**
 * Security package 4, FIX 12 (2026-10-05, see DECISIONS.md) — a short,
 * safe-to-log signal for a caught error, used in place of passing the
 * raw err/error object to console.error across the app. `console.error`
 * on a raw object prints every enumerable property Node can find —
 * which, for some SDK error classes (Supabase, Resend), is more than
 * just a message and isn't practical to audit per call site. This
 * extracts a structured code when the error exposes one (Prisma's
 * `PrismaClientKnownRequestError#code`, e.g. "P2002"; Supabase's
 * AuthError/PostgrestError#status or #code), else falls back to
 * `message` alone — never the full object, never a stack trace.
 *
 * `message` is trusted not to echo request input back: Prisma's own
 * constraint-violation messages name the *field* ("Unique constraint
 * failed on the fields: (`email`)"), never the value, and the SDK/
 * framework errors this app actually catches are infrastructure-level
 * (network, auth-provider, storage), not validation errors built from
 * user-submitted strings. Call sites that log literal request data
 * directly (an email, a token) are a separate, deliberate removal —
 * see DECISIONS.md — this helper only governs the `err`/`error` object.
 */
export function errCode(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.code === "string" && e.code) return e.code;
    if (typeof e.status === "number") return `status:${e.status}`;
    if (typeof e.message === "string" && e.message) return e.message;
  }
  if (typeof err === "string" && err) return err;
  return "unknown_error";
}
