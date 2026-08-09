// Minimal, dependency-free frontmatter parser for /legal/*.md — the
// format is deliberately constrained (flat `key: value` pairs between
// two `---` lines), so a real YAML library isn't worth adding just for
// this. Shared between scripts/check-legal.ts and the public legal-page
// renderer (once real document content exists).
export type LegalFrontmatter = {
  title?: string;
  effective_date?: string;
  last_updated?: string;
};

export function parseFrontmatter(raw: string): { data: LegalFrontmatter; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const [, frontmatter, content] = match;
  const data: LegalFrontmatter = {};
  for (const line of frontmatter.split("\n")) {
    const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (kv) {
      const [, key, value] = kv;
      (data as Record<string, string>)[key] = value;
    }
  }
  return { data, content };
}
