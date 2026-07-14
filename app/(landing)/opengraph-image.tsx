import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const alt = "Obsidian Club — Private Community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share preview for the landing page — the real logo lockup
// (design_handoff_obsidian_club_landing/, 2026-07), not a redrawn
// approximation. See DECISIONS.md.
export default function Image() {
  const logo = readFileSync(join(process.cwd(), "public/images/logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0908",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={674} height={560} alt="" />
      </div>
    ),
    { ...size }
  );
}
