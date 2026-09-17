// Item 1, 2026-09-17 — read-only, count + newest first. No actions:
// nothing here is ever reviewed, approved, or emailed; this is purely
// "here's who left an address," matching the feature's own privacy
// posture (no email capture routine yet sends anything to anyone).
export type EmailCaptureRow = { id: string; email: string; createdAt: string };

export default function EmailCapturesPanel({ captures, total }: { captures: EmailCaptureRow[]; total: number }) {
  return (
    <div className="card mb-6">
      <p className="text-label mb-3">
        Email Captures — {total} total{captures.length < total ? `, showing latest ${captures.length}` : ""}
      </p>
      {captures.length === 0 ? (
        <p className="text-caption" style={{ color: "var(--color-text-secondary)" }}>
          None yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {captures.map((c) => (
            <li key={c.id} className="text-caption flex items-center justify-between gap-4">
              <span>{c.email}</span>
              <span style={{ color: "var(--color-text-muted)" }}>
                {new Date(c.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
