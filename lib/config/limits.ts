// Multi-photo posts, Phase C (C2, 2026-10-10, see DECISIONS.md).
// Server-only — the composer's own copy ("Up to three images," "Three
// is the limit.") is hardcoded to match the default rather than reading
// this at build time; this function is what the server actually
// enforces against on every request regardless of what the client UI
// says.
export function getMaxPhotosPerPost(): number {
  const raw = process.env.MAX_PHOTOS_PER_POST;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}
