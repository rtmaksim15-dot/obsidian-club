import type { ReactNode } from "react";

// Minimal markdown renderer for /legal/*.md public bodies (Block 2,
// 2026-08-10) — deliberately not a general-purpose CommonMark parser,
// dependency-free per this project's convention (see lib/utils/csv.ts,
// lib/legal/parse-document.ts): handles exactly the constructs these
// four documents actually use (headings, bold, blockquotes, ordered/
// unordered lists, paragraphs), plus two things generic markdown
// doesn't do — dropping `[^footnote]` reference markers (their
// definitions are already stripped by extractPublicBody, so a leftover
// marker would dangle) and turning known cross-document references like
// `[Terms of Service]` into real links to the other legal pages.
const DOC_LINKS: Record<string, string> = {
  "Terms of Service": "/terms",
  "Privacy Policy": "/privacy",
  "Acceptable Use Policy": "/guidelines",
  "DMCA Policy": "/dmca",
  "Code of Conduct and Safety & Respect Guidelines": "/codex",
};

const FOOTNOTE_REF_PATTERN = /\[\^[a-zA-Z0-9-]+\]/g;
const BOLD_OR_LINK_PATTERN = new RegExp(
  `\\*\\*(.+?)\\*\\*|\\[(${Object.keys(DOC_LINKS).join("|")})\\]`,
  "g",
);

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const clean = text.replace(FOOTNOTE_REF_PATTERN, "");
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;

  const pattern = new RegExp(BOLD_OR_LINK_PATTERN.source, "g");
  while ((match = pattern.exec(clean))) {
    if (match.index > lastIndex) nodes.push(clean.slice(lastIndex, match.index));
    if (match[1] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-${i}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      nodes.push(
        <a key={`${keyPrefix}-${i}`} href={DOC_LINKS[match[2]]} className="underline decoration-ob-subtle hover:decoration-ob-text">
          {match[2]}
        </a>,
      );
    }
    lastIndex = pattern.lastIndex;
    i++;
  }
  if (lastIndex < clean.length) nodes.push(clean.slice(lastIndex));
  return nodes;
}

function isBlockStart(line: string): boolean {
  return /^#{1,2}\s|^>|^\d+\.\s|^[-*]\s/.test(line);
}

export function LegalMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      blocks.push(
        <h2 key={key} className="text-h2 !text-lg !normal-case !tracking-normal mt-10 mb-3">
          {renderInline(h2[1], `h2-${key}`)}
        </h2>,
      );
      key++;
      i++;
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      // Only ever the document title, already rendered separately by
      // the page shell — extractPublicBody drops the header section
      // this normally lives in, so this branch is a defensive no-op.
      i++;
      continue;
    }

    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key} className="border-l-2 border-ob-border pl-4 my-4">
          {quoteLines.map((l, idx) => (
            <p key={idx} className="text-body">
              {renderInline(l, `bq-${key}-${idx}`)}
            </p>
          ))}
        </blockquote>,
      );
      key++;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (orderedMatch || bulletMatch) {
      const ordered = !!orderedMatch;
      const itemPattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(itemPattern);
        if (!m) break;
        const parts = [m[1]];
        i++;
        // These documents wrap long list items across multiple source
        // lines with no marker on the continuation (see e.g. the DMCA
        // policy's counter-notice list) — without folding those back
        // in, a **bold** span that crosses the wrap gets split across
        // two blocks and never closes.
        while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
          parts.push(lines[i].trim());
          i++;
        }
        items.push(parts.join(" "));
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key} className={ordered ? "list-decimal pl-6 space-y-1 text-body" : "list-disc pl-6 space-y-1 text-body"}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li-${key}-${idx}`)}</li>
          ))}
        </ListTag>,
      );
      key++;
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key} className="text-body mb-4">
        {renderInline(paraLines.join(" "), `p-${key}`)}
      </p>,
    );
    key++;
  }

  return <div>{blocks}</div>;
}
