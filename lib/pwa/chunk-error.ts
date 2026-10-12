// PWA hardening, Package 3 (2026-10-11, see DECISIONS.md) — after a
// deploy, a client-side navigation already in progress on an old,
// still-open build can try to lazy-load a JS/CSS chunk Vercel no
// longer serves under that build's hash. Next.js surfaces this as an
// Error named "ChunkLoadError" (webpack) or a "Loading chunk N failed"
// message. One automatic hard reload fixes it (the reload picks up
// the current build); a reload loop would happen if the SAME tab hit
// this twice in a row without the flag below, which is why the actual
// reload attempt in PwaUpdateManager.tsx is gated on
// shouldAutoReloadForChunkError, not fired unconditionally.
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "ChunkLoadError") return true;
  return /loading (css )?chunk [\w.-]+ failed/i.test(error.message);
}

export function shouldAutoReloadForChunkError(alreadyAttempted: boolean): boolean {
  return !alreadyAttempted;
}
