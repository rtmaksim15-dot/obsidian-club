import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

// Brand fonts (DESIGN.md §3). Cinzel — headings/brand; Cormorant — body; Inter — data/UI.
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const title = "Obsidian Club — Private Community";
const description = "A closed society for those who understand.";

export const metadata: Metadata = {
  // NOTE: set NEXT_PUBLIC_APP_URL in .env.local / Vercel once the domain is
  // live — otherwise OG/canonical URLs below resolve against localhost.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title,
  description,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  // PWA manifest (pre-launch block, 2026-08-08): `apple: true` (rather
  // than a manual <meta name="apple-mobile-web-app-capable"> tag) is
  // what actually makes "Add to Home Screen" open fullscreen/standalone
  // on iOS instead of just bookmarking obsidianclub.online in Safari —
  // without it the OC icon and manifest above are cosmetic only.
  // "black-translucent" draws content under the status bar; safe, since
  // globals.css already pads every page with env(safe-area-inset-*).
  // No hand-crafted apple-touch-startup-image set (that's ~10 separate
  // PNGs per iPhone/iPad screen size/orientation for a monogram-only
  // splash) — iOS auto-generates a splash from the manifest's icon +
  // background_color once `capable` is set, which is what "the right
  // splash" needs for a single flat-color mark like this one.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Obsidian",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  // Indexable on purpose: the landing page exists to be found via search
  // and social so the waitlist grows (ROADMAP Week 1-3 content/SEO track).
  // The platform itself (app/(platform)/*) stays gated behind auth, not robots.
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Obsidian Club",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0908",
  viewportFit: "cover", // required for env(safe-area-inset-*) in globals.css
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${cormorant.variable} ${inter.variable} antialiased`}
      >
        {children}
        {/* Vercel sets VERCEL=1 at build time only when actually deployed
            there; skip elsewhere so the script doesn't 404 in local/non-Vercel dev. */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
