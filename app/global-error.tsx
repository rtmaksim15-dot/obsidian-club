"use client";

// August hardening pass (ROADMAP v3.1), Block 3 (2026-08-04): catches an
// error thrown by the root layout itself (rare — app/error.tsx handles
// everything else). Next.js requires this to render its own <html>/
// <body>, replacing the whole document, so it can't rely on
// app/layout.tsx's font providers or app/globals.css ever loading —
// plain inline styles only, kept deliberately minimal since this is the
// last line of defense and must not itself be able to fail.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px",
          background: "#0a0908",
          color: "#e8e4dc",
          fontFamily: "Georgia, serif",
        }}
      >
        <h1 style={{ fontSize: "1.75rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Something Broke</h1>
        <p style={{ marginTop: "16px", maxWidth: "24rem", opacity: 0.8 }}>
          Something went wrong on our end. It has been noted — try again, or come back shortly.
        </p>
        <div style={{ marginTop: "32px", display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#8b1a1a",
              color: "#e8e4dc",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontSize: "0.8rem",
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: "0.75rem 1.5rem",
              color: "#e8e4dc",
              border: "1px solid #3a3632",
              borderRadius: "2px",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontSize: "0.8rem",
            }}
          >
            Return home
          </a>
        </div>
      </body>
    </html>
  );
}
