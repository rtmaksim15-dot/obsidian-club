import { LikeButton } from "obsidian-club";

export const Unliked = () => (
  <LikeButton postId="p-ritual" initialCount={12} initialLiked={false} />
);

export const Liked = () => (
  <LikeButton postId="p-manifesto" initialCount={148} initialLiked={true} />
);

export const NoLikesYet = () => (
  <LikeButton postId="p-new" initialCount={0} initialLiked={false} />
);
