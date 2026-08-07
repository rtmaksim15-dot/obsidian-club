/**
 * Minimal CSV row parser — handles quoted fields (RFC 4180 double-quote
 * escaping) since a real name column can contain a comma ("Smith, Jr.").
 * Not a general-purpose CSV library: no multi-line quoted fields, no
 * alternate delimiters — the one caller (invite-batch email upload)
 * doesn't need either.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

export type CsvRow = { email: string; name: string };

/**
 * Parses an (email, name) CSV — a header row is optional; if the first
 * row's first cell isn't a plausible email, it's treated as a header
 * and skipped. Column order is always email, name.
 */
export function parseEmailNameCsv(text: string): CsvRow[] {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const first = parseCsvLine(lines[0]);
  const startIndex = first[0] && !first[0].includes("@") ? 1 : 0;

  return lines.slice(startIndex).map((line) => {
    const [email = "", name = ""] = parseCsvLine(line);
    return { email: email.trim(), name: name.trim() };
  });
}
