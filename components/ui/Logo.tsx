// OC monogram (DESIGN.md §4, extended by docs/LordObsidian.md's 2026-07-04
// visual identity guide): O — double contour (light on dark), C — double
// contour accent red, a small spear glyph on the axis between them
// ("focus, control, direction — the axis that holds strength and
// community in balance"). Rendered as outlined Cinzel glyphs so it reads
// as the brand mark until the final vector asset is supplied.

type LogoProps = {
  size?: number;
  className?: string;
  /** "dark" = on obsidian background (O light). "light" = on light background (O black). */
  variant?: "dark" | "light";
};

export default function Logo({ size = 200, variant = "dark", className }: LogoProps) {
  const oColor = variant === "dark" ? "var(--color-text-primary)" : "#0A0908";
  const bg = variant === "dark" ? "var(--color-bg-primary)" : "#EDEAE4";
  const height = Math.round((size * 150) / 220);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 220 150"
      role="img"
      aria-label="Obsidian Club — OC monogram"
      className={className}
    >
      <g
        fontFamily="var(--font-cinzel), Cinzel, serif"
        fontWeight={600}
        fontSize={150}
        textAnchor="middle"
      >
        {/* O — double contour */}
        <text x={72} y={116} fill="none" stroke={oColor} strokeWidth={6}>
          O
        </text>
        <text x={72} y={116} fill="none" stroke={bg} strokeWidth={2.5}>
          O
        </text>
        {/* C — double contour, accent */}
        <text x={146} y={116} fill="none" stroke="var(--color-accent)" strokeWidth={6}>
          C
        </text>
        <text x={146} y={116} fill="none" stroke={bg} strokeWidth={2.5}>
          C
        </text>
      </g>

      {/* The spear — the axis between O (strength) and C (community),
          per docs/LordObsidian.md's symbolism. Split top/bottom to echo
          both halves of the mark. */}
      <g>
        <polygon points="109,40 103,63 115,63" fill={oColor} />
        <polygon points="109,86 103,63 115,63" fill="var(--color-accent)" />
      </g>
    </svg>
  );
}
