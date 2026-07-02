import { ImageResponse } from "next/og";

export const alt = "Obsidian Club — Private Community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share preview for the landing page. Placeholder styling until a
// real brand asset is supplied — mirrors the Hero section's layout.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0908",
        }}
      >
        <div style={{ display: "flex", fontFamily: "serif", fontWeight: 700, fontSize: 140 }}>
          <span style={{ color: "#EDEAE4" }}>O</span>
          <span style={{ color: "#8B1A1A" }}>C</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontFamily: "serif",
            fontWeight: 700,
            fontSize: 56,
            letterSpacing: 12,
            color: "#EDEAE4",
          }}
        >
          OBSIDIAN CLUB
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontFamily: "serif",
            fontWeight: 600,
            fontSize: 24,
            letterSpacing: 10,
            color: "#8B1A1A",
          }}
        >
          PRIVATE COMMUNITY
        </div>
      </div>
    ),
    { ...size }
  );
}
