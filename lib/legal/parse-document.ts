// Parses the real attorney-drafted /legal/*.md convention (2026-08-10,
// replacing the YAML-frontmatter format the placeholder stubs used —
// the real files never used it, they use plain bold-label lines in the
// body instead):
//
//   # Obsidian Club — Terms of Service
//
//   **Effective date:** [EFFECTIVE DATE]
//   **Last updated:** [DATE]
//
//   > Draft for attorney review — not legal advice. ...
//
//   ---
//
//   ## 1. ...
export type LegalDocMeta = {
  title: string;
  effectiveDate: string | null;
  lastUpdated: string | null;
};

const TITLE_PATTERN = /^#\s+(.+)$/m;
const EFFECTIVE_DATE_PATTERN = /^\*\*Effective date:\*\*\s*(.+)$/m;
const LAST_UPDATED_PATTERN = /^\*\*Last updated:\*\*\s*(.+)$/m;
const ATTORNEY_FOOTNOTES_HEADING = /^###\s*Attorney-review footnotes/i;
const PART_B_HEADING = /^##\s*Part B\b/i;

export function parseLegalDocMeta(raw: string): LegalDocMeta {
  return {
    title: raw.match(TITLE_PATTERN)?.[1]?.trim() ?? "",
    effectiveDate: raw.match(EFFECTIVE_DATE_PATTERN)?.[1]?.trim() ?? null,
    lastUpdated: raw.match(LAST_UPDATED_PATTERN)?.[1]?.trim() ?? null,
  };
}

// The body a member should actually see: everything after the header
// block (title/dates/draft-disclaimer blockquote), minus the trailing
// "Attorney-review footnotes" section (counsel-facing, never for a
// reader) and — for documents like the DMCA policy that bundle an
// internal implementation checklist in the same source file — minus
// any "## Part B" section onward. Sections are delimited by `\n---\n`
// dividers, the same convention the real files already use to separate
// header / body / footnotes (and, in the DMCA policy, Part A / Part B).
export function extractPublicBody(raw: string): string {
  const sections = raw.split(/\n---\n/);
  const body = sections
    .slice(1)
    .filter((section) => {
      const heading = section.trim().split("\n")[0] ?? "";
      if (ATTORNEY_FOOTNOTES_HEADING.test(heading)) return false;
      if (PART_B_HEADING.test(heading)) return false;
      return true;
    })
    .join("\n\n");
  return body.trim();
}
