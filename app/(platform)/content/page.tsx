import { redirect } from "next/navigation";

// `/content` was split into `/feed` and `/library` as part of the
// navigation restructure (CLAUDE.md, 2026-07-05 — see ADR-0015). Kept as
// a redirect, not deleted outright, since it may be bookmarked/linked
// externally already.
export default function ContentRedirect() {
  redirect("/feed");
}
