import "server-only";

// Block 2 (August hardening pass, 2026-08-04): the declared MIME type on
// an upload (`file.type` / a client-sent `Content-Type` header) is
// trivially spoofable — it's just a client-supplied label, never a
// sniff of the actual bytes. Checking only that label against an
// allowlist (as this app's upload routes did before this) still lets an
// attacker upload arbitrary content — including an SVG or HTML payload
// with embedded `<script>` — declared as `image/jpeg`. This checks the
// real file signature (magic bytes) instead, which an SVG/HTML payload
// can never match. Covers exactly the four types this app allows.
const SIGNATURES: { type: string; bytes: (number | null)[] }[] = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] }, // "GIF8" (87a or 89a)
  // WEBP: "RIFF" + 4-byte size (any value) + "WEBP"
  { type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50] },
];

export function isValidImageSignature(bytes: Uint8Array): boolean {
  return SIGNATURES.some(
    (sig) => bytes.length >= sig.bytes.length && sig.bytes.every((b, i) => b === null || bytes[i] === b),
  );
}
