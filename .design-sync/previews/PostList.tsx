import { PostList } from "obsidian-club";

const author = (
  displayName: string,
  level: number,
  avatarUrl: string | null = null,
) => ({ id: displayName.toLowerCase(), displayName, avatarUrl, level });

const posts = [
  {
    id: "1",
    title: null,
    content:
      "Discipline is not punishment. It is the quiet architecture beneath everything you admire in a person. Build it before you need it.",
    type: "post" as const,
    likesCount: 148,
    author: author("Lord Obsidian", 6),
    likes: [{ userId: "me" }],
    _count: { comments: 23 },
  },
  {
    id: "2",
    title: "On Restraint",
    content:
      "The strongest signal you can send in a room is the thing you choose not to say. Silence, held deliberately, is louder than any argument.",
    type: "manifesto" as const,
    likesCount: 92,
    author: author("Mara V.", 4),
    likes: [],
    _count: { comments: 11 },
  },
  {
    id: "3",
    title: null,
    content: "First ritual completed. Six weeks. No missed mornings.",
    type: "story" as const,
    likesCount: 34,
    author: author("Adrian K.", 2),
    likes: [{ userId: "me" }],
    _count: { comments: 4 },
  },
];

export const Feed = () => (
  <div style={{ maxWidth: 560, padding: "1.5rem" }}>
    <PostList posts={posts} />
  </div>
);

export const Empty = () => (
  <div style={{ maxWidth: 560, padding: "1.5rem" }}>
    <PostList posts={[]} />
  </div>
);
