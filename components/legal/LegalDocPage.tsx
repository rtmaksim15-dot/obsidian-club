import type { PublicLegalDoc } from "@/lib/legal/read-doc";
import { LegalMarkdown } from "./LegalMarkdown";

export function LegalDocPage({ doc }: { doc: PublicLegalDoc }) {
  return (
    <article>
      <h1 className="text-h1 mb-3">{doc.title}</h1>
      <p className="text-caption mb-10" style={{ color: "var(--color-text-secondary)" }}>
        Effective date: {doc.effectiveDate ?? "—"} · Last updated: {doc.lastUpdated ?? "—"}
      </p>
      <LegalMarkdown markdown={doc.body} />
    </article>
  );
}
