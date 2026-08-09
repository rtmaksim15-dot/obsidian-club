import fs from "fs";
import path from "path";
import { parseFrontmatter } from "../lib/legal/frontmatter";

// Legal-package safety check (pre-launch cleanup 3, Block 3, 2026-08-09)
// — same "trip-wire" pattern as scripts/check-rls.ts. A public
// /legal/*.md file (everything except internal/) reaching a real build
// with an unfilled placeholder, a [LAWYER ...] footnote (written for
// the lawyer reviewing the draft, never the reader), or a missing
// Effective date is a direct reputational/legal risk — this fails the
// build rather than relying on someone remembering to check by eye.
// Wired into `prebuild` (package.json) so `npm run build` can't
// succeed while any of this is true.

const LEGAL_DIR = path.join(process.cwd(), "legal");
const SEARCH_DIRS = ["app", "components", "lib"];

// Matches a bracketed token whose first 3+ characters are uppercase
// letters/underscores — e.g. [DRAFT_PENDING], [CHECKBOX_TEXT_PENDING].
// [LAWYER ...] technically matches this too, but gets its own check
// (below) so the two error categories stay distinct in the output.
const PLACEHOLDER_PATTERN = /\[([A-Z][A-Z_]{2,})\b[^\]]*\]/g;

// Matches import/require/dynamic-import of a path containing
// legal/internal — deliberately narrower than a bare substring search,
// which would also flag e.g. app/robots.ts's Disallow rule (the literal
// text "legal/internal/" as a URL path, not an import).
const IMPORT_PATTERN = /(?:from\s+|require\(|import\()\s*["'][^"']*legal\/internal[^"']*["']/;

type Problem = { file: string; issue: string };

function checkPublicFile(filePath: string, relPath: string, problems: Problem[]) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontmatter(raw);

  const placeholders = new Set<string>();
  for (const m of Array.from(content.matchAll(PLACEHOLDER_PATTERN))) {
    if (m[1] !== "LAWYER") placeholders.add(m[0]);
  }
  if (placeholders.size > 0) {
    problems.push({ file: relPath, issue: `Unfilled placeholder(s): ${Array.from(placeholders).join(", ")}` });
  }

  if (content.includes("[LAWYER")) {
    problems.push({ file: relPath, issue: "Contains a [LAWYER ...] footnote — strip before publishing." });
  }

  const effectiveDate = data.effective_date?.trim();
  if (!effectiveDate || /^\[.*\]$/.test(effectiveDate)) {
    problems.push({ file: relPath, issue: "Missing or placeholder `effective_date` in frontmatter." });
  }
}

function findInternalImports(problems: Problem[]) {
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const src = fs.readFileSync(full, "utf8");
        // Matches an actual import/require of a path containing
        // legal/internal — not just any mention of that string (e.g.
        // app/robots.ts's Disallow rule names the path as plain text,
        // which isn't an import and shouldn't trip this check).
        if (IMPORT_PATTERN.test(src)) {
          problems.push({
            file: path.relative(process.cwd(), full),
            issue: "Imports from legal/internal/ — internal documents must never reach /app.",
          });
        }
      }
    }
  }
  for (const dir of SEARCH_DIRS) walk(path.join(process.cwd(), dir));
}

function main() {
  const problems: Problem[] = [];

  if (!fs.existsSync(LEGAL_DIR)) {
    console.error("No /legal directory found.");
    process.exitCode = 1;
    return;
  }

  const publicFiles = fs
    .readdirSync(LEGAL_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"));

  for (const entry of publicFiles) {
    checkPublicFile(path.join(LEGAL_DIR, entry.name), `legal/${entry.name}`, problems);
  }

  findInternalImports(problems);

  console.log(
    `Checked ${publicFiles.length} public legal document(s) and every .ts/.tsx/.js/.jsx file under ${SEARCH_DIRS.join("/, ")}/.`,
  );

  if (problems.length > 0) {
    console.error("\nProblems found:\n");
    problems.forEach((p) => console.error(`  - ${p.file}: ${p.issue}`));
    console.error(
      "\nA public legal document with an unfilled placeholder, a [LAWYER ...] " +
        "footnote, a missing Effective date, or a leaked import from " +
        "legal/internal/ must never reach a real build.",
    );
    process.exitCode = 1;
  } else {
    console.log("All public legal documents are clean. No internal-document imports found.");
  }
}

main();
