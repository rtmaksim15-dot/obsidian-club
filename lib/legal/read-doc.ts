import fs from "fs";
import path from "path";
import { parseLegalDocMeta, extractPublicBody } from "./parse-document";

export type PublicLegalDoc = {
  title: string;
  effectiveDate: string | null;
  lastUpdated: string | null;
  body: string;
};

// Reads a public /legal/*.md file straight off disk at request time —
// same approach scripts/check-legal.ts already uses, and simplest given
// these documents get replaced in place by hand until finalized. Only
// call this with one of the four public filenames (02/03/04/06); the
// filename string appearing here is exactly what
// scripts/check-legal.ts#findWiredFiles looks for to flip that
// document's gate from a warning to a build-blocking hard fail.
export function readPublicLegalDoc(filename: string): PublicLegalDoc {
  const raw = fs.readFileSync(path.join(process.cwd(), "legal", filename), "utf8");
  const meta = parseLegalDocMeta(raw);
  return { ...meta, body: extractPublicBody(raw) };
}
