// OC monogram — real brand asset (docs/LordObsidian.md's 2026-07-04 visual
// identity guide), cropped from Max's identity-guide artwork: O in black
// double contour, C in burgundy double contour, the spear glyph on the
// axis between them ("focus, control, direction"). Replaces the earlier
// hand-drawn SVG placeholder (see TECH_DEBT.md, closed 2026-07-04).

const ASPECT = 538 / 880; // source crop's real height/width ratio

type LogoProps = {
  size?: number;
  className?: string;
  /**
   * The source asset only exists shot against Obsidian Club's dark
   * textured background — there's no light-background version yet. Kept
   * for API compatibility with existing call sites; only "dark" is
   * actually implemented today.
   */
  variant?: "dark" | "light";
};

export default function Logo({ size = 200, className }: LogoProps) {
  const height = Math.round(size * ASPECT);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/oc-monogram.webp"
      alt="Obsidian Club — OC monogram"
      width={size}
      height={height}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
