import type { MetadataRoute } from "next";

// /robots.txt (member protection mechanics, pre-launch legal package,
// 2026-08-09, Block 6). `/legal/internal/` is disallowed defensively —
// it's a raw markdown source directory, never an actual rendered
// route, so nothing currently links to it or could be crawled — but
// the moment any future code accidentally exposes it, this rule is
// already in place rather than being an afterthought. Public legal
// pages (/terms, /privacy, /acceptable-use, /dmca, /2257) are
// deliberately indexable — a lawyer, payment provider, or regulator
// needs to be able to find them without an account, same reasoning as
// the landing page's own indexable metadata (app/layout.tsx).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /invitation (landing-page pivot, 2026-08-23, see DECISIONS.md):
      // the physical card's QR destination. Reachable by anyone who
      // types the URL — this is obscurity, not access control (the
      // real gate is the Accept decision) — but nothing should link to
      // it or list it, so it shouldn't be crawled/indexed either. See
      // that page's own `noindex` metadata for the second half of this.
      disallow: ["/legal/internal/", "/invitation"],
    },
  };
}
