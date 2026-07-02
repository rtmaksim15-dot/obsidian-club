import { ImageResponse } from "next/og";

// Generates the OC monogram app icon (DESIGN.md §4: O light, C accent red,
// black background) at a given size, used by the PWA manifest icon routes.
// Placeholder until a real vector asset is supplied — see components/ui/Logo.tsx.
export function renderIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0908",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "serif",
            fontWeight: 700,
            fontSize: size * 0.5,
          }}
        >
          <span style={{ color: "#EDEAE4" }}>O</span>
          <span style={{ color: "#8B1A1A" }}>C</span>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
