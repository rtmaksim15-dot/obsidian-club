import fs from "fs";
import path from "path";
import { parseFrontmatter } from "../lib/legal/frontmatter";

// Legal-package safety check (pre-launch cleanup 3, Block 3, 2026-08-09;
// severity split 2026-08-10) — same "trip-wire" pattern as
// scripts/check-rls.ts. A public /legal/*.md file (everything except
// internal/) with an unfilled placeholder, a [LAWYER ...] footnote
// (written for the lawyer reviewing the draft, never the reader), or a
// missing Effective date is a direct reputational/legal risk — but it
// only HARD-fails the build once that specific file is actually wired
// to a public route (i.e. some file under app/ reads it). Attorney
// finalization can take weeks; freezing every deploy — including ones
// with no legal changes at all — until every document is signed off is
// its own outage. Until a doc is wired in, problems are reported as
// warnings so the gate stays informative without blocking unrelated
// work. The moment a route starts reading a given file, its problems
// become build-blocking again — so it remains impossible to publish
// placeholder legal text. Wired into `prebuild` (package.json).

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

function checkPublicFile(filePath: string, relPath: string): Problem[] {
  const problems: Problem[] = [];
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

  return problems;
}

// A public legal doc is "wired" once some file under app/ actually
// reads it — i.e. it's reachable from a real route, not just sitting
// in /legal/ waiting on the lawyer. Detected the same low-tech way as
// findInternalImports: a plain-text scan for the filename, since a
// route will reference it either via an import path or a
// fs.readFileSync(...) call naming the file. Unwired docs get warnings
// only; wired docs get the hard build-blocking treatment.
function findWiredFiles(publicFileNames: string[]): Set<string> {
  const wired = new Set<string>();

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const src = fs.readFileSync(full, "utf8");
        for (const name of publicFileNames) {
          if (src.includes(name)) wired.add(name);
        }
      }
    }
  }
  for (const dir of SEARCH_DIRS) walk(path.join(process.cwd(), dir));

  return wired;
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
  const hardProblems: Problem[] = [];
  const warnings: Problem[] = [];

  if (!fs.existsSync(LEGAL_DIR)) {
    console.error("No /legal directory found.");
    process.exitCode = 1;
    return;
  }

  const publicFiles = fs
    .readdirSync(LEGAL_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"));

  const wired = findWiredFiles(publicFiles.map((e) => e.name));

  for (const entry of publicFiles) {
    const problems = checkPublicFile(path.join(LEGAL_DIR, entry.name), `legal/${entry.name}`);
    if (problems.length === 0) continue;
    if (wired.has(entry.name)) {
      hardProblems.push(...problems);
    } else {
      warnings.push(...problems);
    }
  }

  // Internal-document leaks are always a hard fail — there's no "not
  // wired yet" grace period for those, since the import itself is the
  // violation regardless of what the target document contains.
  findInternalImports(hardProblems);

  console.log(
    `Checked ${publicFiles.length} public legal document(s) and every .ts/.tsx/.js/.jsx file under ${SEARCH_DIRS.join("/, ")}/.`,
  );

  if (warnings.length > 0) {
    console.warn("\nWarnings (not yet wired to a public route — will hard-fail once they are):\n");
    warnings.forEach((p) => console.warn(`  - ${p.file}: ${p.issue}`));
  }

  if (hardProblems.length > 0) {
    console.error("\nBuild-blocking problems (wired to a public route):\n");
    hardProblems.forEach((p) => console.error(`  - ${p.file}: ${p.issue}`));
    console.error(
      "\nA public legal document with an unfilled placeholder, a [LAWYER ...] " +
        "footnote, a missing Effective date, or a leaked import from " +
        "legal/internal/ must never reach a real build once it's wired to a route.",
    );
    process.exitCode = 1;
  } else if (warnings.length === 0) {
    console.log("All public legal documents are clean. No internal-document imports found.");
  } else {
    console.log("\nNo build-blocking problems (nothing above is wired to a public route yet).");
  }
}

main();
