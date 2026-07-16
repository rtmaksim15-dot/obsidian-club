import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Only structurally-documented rooms are seeded here — CLAUDE.md §7 names
// general rooms, a newcomers' room, and 7 specific local circles; it never
// names specific thematic topics, so none are invented here. See
// DECISIONS.md, 2026-07-03. Thematic rooms are created by admins
// (POST /api/admin/rooms) as the community actually needs them.
const ROOMS: {
  name: string;
  slug: string;
  description: string;
  type: "general" | "newcomers" | "local";
  city?: string;
  country?: string;
}[] = [
  {
    name: "General",
    slug: "general",
    description: "The club's common room.",
    type: "general",
  },
  {
    name: "Newcomers",
    slug: "newcomers",
    description: "For members in their first 30 days.",
    type: "newcomers",
  },
  { name: "SF Circle", slug: "sf-circle", description: "San Francisco.", type: "local", city: "San Francisco", country: "US" },
  { name: "LA Circle", slug: "la-circle", description: "Los Angeles.", type: "local", city: "Los Angeles", country: "US" },
  { name: "Miami Circle", slug: "miami-circle", description: "Miami.", type: "local", city: "Miami", country: "US" },
  { name: "NY Circle", slug: "ny-circle", description: "New York.", type: "local", city: "New York", country: "US" },
  { name: "Berlin Circle", slug: "berlin-circle", description: "Berlin.", type: "local", city: "Berlin", country: "DE" },
  { name: "London Circle", slug: "london-circle", description: "London.", type: "local", city: "London", country: "GB" },
  { name: "Tokyo Circle", slug: "tokyo-circle", description: "Tokyo.", type: "local", city: "Tokyo", country: "JP" },
];

// Houses System (CLAUDE.md, restored version, 2026-07-08) — Phase 1 is
// House of Rope, the only house Max has actually named so far. Its Room
// is a real, plain `thematic` room (not a new RoomType — the type enum
// is about room *mechanics*, not which house a room belongs to;
// `houseId` is the link).
const HOUSES: { name: string; slug: string; tagline: string; description: string }[] = [
  {
    name: "House of Rope",
    slug: "house-of-rope",
    tagline: "Shibari / Kinbaku",
    description:
      "House of Rope is Obsidian Club's dedicated home for shibari and kinbaku — the art of rope as connection, trust, and aesthetic expression. A space for practitioners at every stage, from curious beginners to experienced riggers, built on communication, consent, and care.",
  },
];

// First real content for House of Rope, per Max's direction (2026-07-09).
// The cultural/historical overview is general knowledge, safe to state
// outright. The "getting started" piece is deliberately a safety
// orientation, not a technique tutorial — specific tie instruction is
// exactly the kind of expert-vetted material this project defers to Max
// (or a real instructor), same standing rule as the Initiation Ritual's
// safety-rules content. Authored as Lord Obsidian, the platform's only
// real account today.
const HOUSE_OF_ROPE_ARTICLES: { title: string; content: string }[] = [
  {
    title: "What Is Shibari?",
    content: `Shibari (縛り, literally "to tie") and kinbaku (緊縛, "tight binding") describe the Japanese-originated art of rope bondage. What began centuries ago as a method of physical restraint evolved, through the 20th century, into a deliberate practice of connection — valued today for its aesthetic, meditative, and relational qualities as much as its physical sensation.

At its core, shibari is a conversation conducted in rope: between rigger and rope partner, built on continuous communication, negotiated boundaries, and mutual trust. The rope itself — traditionally natural fiber like jute or hemp — becomes a medium for patience, presence, and craft.

House of Rope exists for exactly this: a place within Obsidian Club to explore the practice, connect with others who share it, and learn from those with real experience — never alone, never without care.`,
  },
  {
    title: "Getting Started in House of Rope",
    content: `Before anything else: rope is a physical practice with real risk, and this house takes that seriously.

A few principles every member should hold, regardless of experience level:

Communication comes first. Negotiate scenes and limits beforehand, check in during, and debrief after. Consent is ongoing, not a one-time checkbox.

Never practice alone. Especially for anything involving suspension or restricted movement, a second person aware of what's happening — and how to get someone out of it quickly — is non-negotiable.

Keep safety shears within reach, always. Seconds matter if something needs to come off fast.

Learn nerve and circulation awareness before you tie. Numbness, tingling, or color change in extremities are stop signals, not things to push through.

Qualified, in-person instruction beats anything written. This page is an orientation, not a substitute for hands-on teaching — House of Rope's room is the place to find people who can actually show you.

Full technique guides, vetted instructor recommendations, and structured learning materials are being developed. This is a starting point, not the finished library.`,
  },
];

// Vault test items (REP system + Vault task, 2026-07-16) — Max explicitly
// asked to seed 3 test items at these thresholds to exercise the
// REP-gating logic. Named/described as test data on purpose, not real
// catalog content (which still doesn't exist — see ADR-0016).
const VAULT_TEST_ITEMS: { name: string; description: string; minRep: number }[] = [
  { name: "Test Item — 10 REP", description: "Placeholder Vault item for REP-gating testing.", minRep: 10 },
  { name: "Test Item — 50 REP", description: "Placeholder Vault item for REP-gating testing.", minRep: 50 },
  { name: "Test Item — 150 REP", description: "Placeholder Vault item for REP-gating testing.", minRep: 150 },
];

async function main() {
  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { slug: room.slug },
      create: { ...room, minLevel: 1 },
      update: {},
    });
  }
  console.log(`Seeded ${ROOMS.length} rooms.`);

  for (const house of HOUSES) {
    const created = await prisma.house.upsert({
      where: { slug: house.slug },
      create: {
        name: house.name,
        slug: house.slug,
        tagline: house.tagline,
        description: house.description,
        status: "active",
      },
      update: { description: house.description },
    });

    await prisma.room.upsert({
      where: { slug: house.slug },
      create: {
        name: house.name,
        slug: house.slug,
        description: house.tagline,
        type: "thematic",
        minLevel: 1,
        houseId: created.id,
      },
      update: { houseId: created.id },
    });
  }
  console.log(`Seeded ${HOUSES.length} house(s).`);

  // House of Rope's first real content — authored as the platform's
  // only real account today (Lord Obsidian). Skipped gracefully if that
  // account doesn't exist yet (e.g. a fresh database before bootstrap).
  const author = await prisma.user.findUnique({ where: { email: "lord.obsidian.oc@gmail.com" } });
  const houseOfRope = await prisma.house.findUnique({ where: { slug: "house-of-rope" } });
  if (author && houseOfRope) {
    for (const article of HOUSE_OF_ROPE_ARTICLES) {
      const existing = await prisma.post.findFirst({
        where: { houseId: houseOfRope.id, title: article.title },
      });
      if (existing) continue;

      await prisma.post.create({
        data: {
          authorId: author.id,
          houseId: houseOfRope.id,
          title: article.title,
          content: article.content,
          type: "article",
          minLevel: 1,
          isPublished: true,
          publishedAt: new Date(),
        },
      });
    }
    console.log(`Seeded ${HOUSE_OF_ROPE_ARTICLES.length} House of Rope article(s).`);
  } else {
    console.log("Skipped House of Rope articles — admin account not found yet.");
  }

  for (const item of VAULT_TEST_ITEMS) {
    const existing = await prisma.vaultItem.findFirst({ where: { name: item.name } });
    if (existing) continue;
    await prisma.vaultItem.create({ data: item });
  }
  console.log(`Seeded ${VAULT_TEST_ITEMS.length} Vault test item(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
