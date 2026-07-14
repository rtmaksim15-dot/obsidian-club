// Real brand monogram — cropped + cutout from the approved design package's
// oc-logo.jpg (public/images/logo-mark.png), not a redrawn SVG. See
// DECISIONS.md, 2026-07-14: the previous inline-SVG monogram was a hand-drawn
// approximation and was deleted everywhere in favor of this raster asset.
const ASPECT = 456 / 675; // logo-mark.png's real height/width ratio

export default function LogoMark({
  size = 34,
  opacity = 1,
  className,
}: {
  size?: number;
  opacity?: number;
  className?: string;
}) {
  const height = Math.round(size * ASPECT);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-mark.png"
      alt="Obsidian Club"
      width={size}
      height={height}
      style={{ opacity, objectFit: "contain" }}
      className={className}
    />
  );
}
