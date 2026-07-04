import type { PostType, User } from "@prisma/client";

/**
 * Minimum level required to create each post type, per `PRODUCT.md` §10's
 * content-creation-rights table. `manifesto` has no minimum level because
 * it isn't member-creatable at all — see `canCreatePostType` below.
 */
const MIN_LEVEL_BY_TYPE: Record<Exclude<PostType, "manifesto">, number> = {
  post: 1,
  story: 1,
  article: 4, // Mentor+
  lecture: 5, // Master+
  course: 5, // Master+
};

/**
 * Whether a member can create a given `PostType`, per `PRODUCT.md` §10.
 * `manifesto` is admin-only regardless of level — no member level grants it.
 */
export function canCreatePostType(user: User, type: PostType): boolean {
  if (type === "manifesto") return user.isAdmin;
  return user.level >= MIN_LEVEL_BY_TYPE[type];
}
