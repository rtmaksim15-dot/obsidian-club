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

async function main() {
  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { slug: room.slug },
      create: { ...room, minLevel: 1 },
      update: {},
    });
  }
  console.log(`Seeded ${ROOMS.length} rooms.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
