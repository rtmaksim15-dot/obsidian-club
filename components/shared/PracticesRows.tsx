type Tag = { id: string; slug: string; label: string };
type GroupedPractices = { limit: Tag[]; practice: Tag[]; curious: Tag[] };

// Profile lite, B2/B5 (Package 4, Phase B, 2026-10-13, see
// DECISIONS.md) — three rows in this order: "My limits" (visually
// emphasised, burgundy — this app's existing --color-accent, not a new
// colour), "I practise", "Curious about". A row renders only when it
// has at least one tag.
export default function PracticesRows({ practices }: { practices: GroupedPractices }) {
  if (practices.limit.length === 0 && practices.practice.length === 0 && practices.curious.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      {practices.limit.length > 0 ? (
        <div>
          <p className="text-label mb-1" style={{ color: "var(--color-accent)" }}>
            My limits
          </p>
          <p className="text-body !text-base" style={{ color: "var(--color-accent)" }}>
            {practices.limit.map((t) => t.label).join(" · ")}
          </p>
        </div>
      ) : null}
      {practices.practice.length > 0 ? (
        <div>
          <p className="text-label mb-1">I practise</p>
          <p className="text-body !text-base">{practices.practice.map((t) => t.label).join(" · ")}</p>
        </div>
      ) : null}
      {practices.curious.length > 0 ? (
        <div>
          <p className="text-label mb-1" style={{ color: "var(--color-text-secondary)" }}>
            Curious about
          </p>
          <p className="text-body !text-base" style={{ color: "var(--color-text-secondary)" }}>
            {practices.curious.map((t) => t.label).join(" · ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
