// Private-storage backfill (task 2, 2026-09-23, see DECISIONS.md) —
// converts Post.mediaUrls entries and User.avatarUrl from full,
// permanent public-bucket URLs into bare Storage paths, backing up
// every original value to MediaUrlBackfillBackup first (a DB table,
// not a committed export — see that model's own schema comment for
// why). Kept as a permanent, reusable script (not scripts/tmp-qa/,
// which is deleted every session) in case this ever needs to run
// again — e.g. against a fresh environment, or to extend coverage.
//
// --dry-run (the default unless --apply is passed): reports exactly
// what would change, writes nothing.
const envLocalPath = require("path").join(process.cwd(), ".env.local");
if (require("fs").existsSync(envLocalPath)) {
  const content = require("fs").readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const POST_PHOTOS_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-photos/`;
const AVATARS_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`;

/** Strips the bucket's public-URL prefix and any trailing query string (avatarUrl's "?v=<timestamp>" cache-bust). */
function toPath(url: string, prefix: string): string | null {
  if (!url.startsWith(prefix)) return null;
  const rest = url.slice(prefix.length);
  const qIndex = rest.indexOf("?");
  return qIndex === -1 ? rest : rest.slice(0, qIndex);
}

async function main() {
  const postsWithPhotos = await prisma.post.findMany({
    where: { mediaUrls: { not: [] } },
    select: { id: true, mediaUrls: true },
  });
  const usersWithAvatars = await prisma.user.findMany({
    where: { avatarUrl: { not: null } },
    select: { id: true, avatarUrl: true },
  });

  let postsMatched = 0;
  let postsUnrecognized: { id: string; mediaUrls: unknown }[] = [];
  let avatarsMatched = 0;
  let avatarsUnrecognized: { id: string; avatarUrl: string }[] = [];

  for (const post of postsWithPhotos) {
    const urls = Array.isArray(post.mediaUrls) ? (post.mediaUrls as unknown[]) : [];
    if (urls.length === 0) continue;
    const allMatch = urls.every((u) => typeof u === "string" && toPath(u, POST_PHOTOS_PREFIX) !== null);
    if (allMatch) {
      postsMatched++;
      if (APPLY) {
        const paths = (urls as string[]).map((u) => toPath(u, POST_PHOTOS_PREFIX)!);
        await prisma.mediaUrlBackfillBackup.create({
          data: { entityType: "post", entityId: post.id, originalValue: urls as any },
        });
        await prisma.post.update({ where: { id: post.id }, data: { mediaUrls: paths } });
      }
    } else {
      postsUnrecognized.push({ id: post.id, mediaUrls: post.mediaUrls });
    }
  }

  for (const user of usersWithAvatars) {
    const path = toPath(user.avatarUrl!, AVATARS_PREFIX);
    if (path) {
      avatarsMatched++;
      if (APPLY) {
        await prisma.mediaUrlBackfillBackup.create({
          data: { entityType: "user_avatar", entityId: user.id, originalValue: [user.avatarUrl] },
        });
        await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: path } });
      }
    } else {
      avatarsUnrecognized.push({ id: user.id, avatarUrl: user.avatarUrl! });
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "APPLIED" : "DRY RUN",
        posts: { totalWithPhotos: postsWithPhotos.length, matched: postsMatched, unrecognized: postsUnrecognized },
        avatars: { totalWithAvatar: usersWithAvatars.length, matched: avatarsMatched, unrecognized: avatarsUnrecognized },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
