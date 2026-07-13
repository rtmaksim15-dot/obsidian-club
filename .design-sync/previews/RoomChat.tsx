import { RoomChat } from "obsidian-club";

const messages = [
  {
    id: "m1",
    content: "Welcome. Read the room's first pinned note before you post.",
    replyToId: null,
    createdAt: "2026-07-12T09:00:00.000Z",
    user: { id: "u-lord", displayName: "Lord Obsidian", avatarUrl: null, level: 6 },
  },
  {
    id: "m2",
    content: "Understood. Grateful to be here.",
    replyToId: null,
    createdAt: "2026-07-12T09:04:00.000Z",
    user: { id: "u-me", displayName: "Adrian K.", avatarUrl: null, level: 2 },
  },
  {
    id: "m3",
    content: "The Thursday sitting is full. I'll open a second table if there's demand.",
    replyToId: null,
    createdAt: "2026-07-12T09:11:00.000Z",
    user: { id: "u-mara", displayName: "Mara V.", avatarUrl: null, level: 4 },
  },
];

export const Conversation = () => (
  <RoomChat
    room={{
      id: "r1",
      slug: "inner-circle",
      name: "The Inner Circle",
      description: "Level 4 and above. Speak plainly.",
    }}
    currentUserId="u-me"
    initialMessages={messages}
  />
);

export const EmptyRoom = () => (
  <RoomChat
    room={{ id: "r2", slug: "new-room", name: "The Antechamber", description: "Newly opened." }}
    currentUserId="u-me"
    initialMessages={[]}
  />
);
