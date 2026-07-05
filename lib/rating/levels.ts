// Level → title names. Renamed 2026-07-05 per CLAUDE.md's "Layer 1 — Title"
// table (Initiate/Keeper/Steward/Warden/Master/Council), replacing the
// original PRODUCT.md names (Initiate/Member/Senior Member/Mentor/Master/
// Council Member). See ADR-0015. Single source of truth — every page that
// displays a level name imports this instead of redefining its own map.
export const LEVEL_NAMES: Record<number, string> = {
  1: "Initiate",
  2: "Keeper",
  3: "Steward",
  4: "Warden",
  5: "Master",
  6: "Council",
};

export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? `Level ${level}`;
}
