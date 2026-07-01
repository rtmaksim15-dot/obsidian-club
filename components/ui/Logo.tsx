// OC monogram (DESIGN.md §4): O — double contour (light on dark), C — double
// contour accent red. Rendered as outlined Cinzel glyphs so it reads as the
// brand mark until the final vector asset is supplied.

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
    </svg>
  );
}
