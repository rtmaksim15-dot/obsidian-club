// Admin security hardening, Package S1 (2026-10-15, see DECISIONS.md) —
// `admin_access_log.ipHash`. The task's own spec calls for a hashed IP
// here (unlike AdminAuthEvent.ip, which stores the raw address for the
// sign-in/MFA audit trail this console already had) — this is a lower-
// sensitivity "who's been in here lately" view, so the IP is one-way
// hashed rather than stored in the clear. HMAC-SHA256 keyed with
// ADMIN_SESSION_SECRET (the same dedicated secret admin-stepup.ts uses,
// not reused from anywhere else) rather than a bare SHA-256: a bare
// hash of an IPv4 address is reversible by brute force (the whole
// keyspace is ~4 billion, trivial to rainbow-table) — keying it with a
// server-only secret is what actually makes it one-way in practice.
// Truncated to 32 hex chars (128 bits) — collision risk is irrelevant
// for this use (display/grouping, not uniqueness enforcement), and a
// shorter value reads better in an admin list.
export async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
