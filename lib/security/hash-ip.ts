import "server-only";
import crypto from "crypto";

// One-way hash for storing an abuse-detection signal without keeping a
// real IP address around (item 1, 2026-09-17). IP_HASH_SALT should be a
// real secret in Vercel's environment variables — this falls back to an
// obviously-fake, logged value in its absence so local dev still works,
// but production must set the real one (see DECISIONS.md).
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    console.error("[hash-ip] IP_HASH_SALT is not set — using an insecure fallback salt.");
  }
  return crypto
    .createHash("sha256")
    .update(`${salt ?? "dev-only-insecure-salt"}:${ip}`)
    .digest("hex");
}
