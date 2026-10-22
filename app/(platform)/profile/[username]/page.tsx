import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import ReviewForm from "@/components/shared/ReviewForm";
import FollowButton from "@/components/shared/FollowButton";
import ContentMenu from "@/components/shared/ContentMenu";
import PostCard, { type FeedPost } from "@/components/shared/PostCard";
import MessageButton from "@/components/shared/MessageButton";
import ZoomableAvatar from "@/components/shared/ZoomableAvatar";
import ProfileTabs from "@/components/shared/ProfileTabs";
import ProfilePhotoGrid from "@/components/shared/ProfilePhotoGrid";
import PracticesRows from "@/components/shared/PracticesRows";
import BondsList from "@/components/shared/BondsList";
import BondRequestButton from "@/components/shared/BondRequestButton";
import PendingBondRequests from "@/components/shared/PendingBondRequests";
import PrivateNoteEditor from "@/components/shared/PrivateNoteEditor";
import { isBlockedEitherWay } from "@/lib/moderation/block";
import { isRitualComplete } from "@/lib/auth/ritual";
import { getMessageButtonState } from "@/lib/dm/relationship";
import { resolveAvatarUrl, resolveAvatarUrls, resolvePostImages } from "@/lib/storage/resolve-media";
import { getVeilEnabled } from "@/lib/profile/veil";
import { getBoundaries } from "@/lib/dm/boundaries";
import { getVisibleBondsForProfile } from "@/lib/profile/bonds";
import { canViewPracticesFor, getUserPractices } from "@/lib/profile/practices";
import { getPrivateNote } from "@/lib/profile/private-notes";
import { formatMemberNumber } from "@/lib/profile/member-number";
import { LEVEL_NAMES } from "@/lib/rating/levels";
import {
  REP_NUMBER_ENABLED,
  REP_HISTORY_UI_ENABLED,
  REVIEWS_UI_ENABLED,
  HOUSES_UI_ENABLED,
  LEVELS_UI_ENABLED,
  PRACTICES_UI_ENABLED,
} from "@/lib/config/feature-flags";
import { isFounder } from "@/lib/config/founder";

/**
 * Member profile — looked up by `username`.
 *
 * Profile lite (Package 4, Phase B, 2026-10-13, see DECISIONS.md) —
 * restructured into a header (avatar/name/Title/Member №/city/bonds)
 * plus tabs "About" (practices rows, About text, reviews/houses/REP
 * history where their own flags allow, invited-by/partner), "Posts"
 * (every published post, text-only included, newest first — the same
 * PostCard the old flat layout used), and "Photos" (a grid of every
 * image from this member's posts). The Phase B-only two-tab layout
 * (About/Photos, with no way to reach a text-only post) was a follow-
 * up-day correction — see DECISIONS.md. Public follower/following
 * counts removed (explicit instruction — reverses the 2026-07-30
 * "Members & Follows" feature's own public counts).
 *
 * "Invited by [name]" / "Partner of [name]" (Invitation & Partner
 * system v1, 2026-08-01) — quiet lines, shown whenever set, for anyone
 * viewing. Partner reads as `partner ?? partnerOf` since only one side
 * of the relationship gets the FK written directly (see DECISIONS.md).
 */
export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    include: {
      invitedBy: { select: { displayName: true, username: true } },
      partner: { select: { displayName: true, username: true } },
      partnerOf: { select: { displayName: true, username: true } },
    },
  });
  if (!user) notFound();

  const partner = user.partner ?? user.partnerOf ?? null;

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === user.id;

  // Clean Hall, B6 (Package 5, Phase B, 2026-10-14, see DECISIONS.md) —
  // a test account's profile is unreachable for anyone but an admin or
  // the account itself ("404-style 'Not found'" — the task's own exact
  // wording — not a real 404, since the row genuinely exists; same
  // not-found() call this page already uses when the row truly doesn't).
  if (user.isTest && !isOwnProfile && !viewer?.isAdmin) notFound();

  // Member protection mechanics (pre-launch legal package, 2026-08-09):
  // a block is mutual in effect — neither side sees the other's
  // content. Checked before any other query runs, so a blocked
  // relationship never even reaches the point of fetching posts/follow
  // state for a profile neither party should be looking at.
  const blocked = viewer && !isOwnProfile ? await isBlockedEitherWay(viewer.id, user.id) : false;

  const canRequestConversation =
    viewer && !isOwnProfile ? viewer.isAdmin || (await isRitualComplete(viewer)) : false;
  const messageButtonState =
    viewer && !isOwnProfile && !blocked && canRequestConversation
      ? await getMessageButtonState(viewer, user.id)
      : null;

  if (blocked) {
    return (
      <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
        <div className="mx-auto max-w-2xl">
          <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
            This profile isn&apos;t available.
          </p>
        </div>
      </main>
    );
  }

  const [reviews, repHistory, memberships, posts, isFollowing, ownerBoundaries, bonds, practicesVisible, pendingBonds, existingBondWithViewer, privateNote] =
    await Promise.all([
      REVIEWS_UI_ENABLED
        ? prisma.review.findMany({
            where: { reviewedId: user.id, isVisible: true },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { reviewer: { select: { id: true, displayName: true } } },
          })
        : Promise.resolve([]),
      // REP's own ledger is more personal than the aggregate score (which
      // is public, above) — shown only to the profile's owner, same
      // reasoning as the review form only showing for other people's
      // profiles, just inverted.
      isOwnProfile && REP_HISTORY_UI_ENABLED
        ? prisma.repHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : Promise.resolve([]),
      HOUSES_UI_ENABLED
        ? prisma.houseMembership.findMany({
            where: { userId: user.id },
            orderBy: { joinedAt: "asc" },
            include: { house: { select: { name: true, slug: true } } },
          })
        : Promise.resolve([]),
      prisma.post.findMany({
        where: { authorId: user.id, isPublished: true },
        orderBy: { publishedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          likesCount: true,
          createdAt: true,
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true, rep: true } },
          house: { select: { id: true, name: true, slug: true } },
          likes: { where: { userId: viewer?.id ?? "" }, select: { userId: true } },
          _count: { select: { comments: true } },
          images: {
            where: { isDeleted: false },
            orderBy: { position: "asc" },
            select: { id: true, storagePath: true, position: true, width: true, height: true },
          },
        },
      }),
      viewer && !isOwnProfile
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewer.id, followingId: user.id } },
          })
        : Promise.resolve(null),
      // Profile lite (Package 4, Phase B, 2026-10-13, see DECISIONS.md)
      getBoundaries(user.id),
      getVisibleBondsForProfile(user.id),
      PRACTICES_UI_ENABLED ? canViewPracticesFor(viewer?.id ?? null, user.id) : Promise.resolve(false),
      isOwnProfile
        ? prisma.bond.findMany({
            where: { toUserId: user.id, status: "pending" },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              kind: true,
              createdAt: true,
              fromUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          })
        : Promise.resolve([]),
      viewer && !isOwnProfile
        ? prisma.bond.findFirst({
            where: {
              OR: [
                { fromUserId: viewer.id, toUserId: user.id },
                { fromUserId: user.id, toUserId: viewer.id },
              ],
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      viewer && !isOwnProfile ? getPrivateNote(viewer.id, user.id) : Promise.resolve(null),
    ]);

  const stars = Math.round(Number(user.reputation));
  const memberSince = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString("en-US", { timeZone: "UTC" })
    : null;

  const practices = practicesVisible
    ? await getUserPractices(user.id)
    : { limit: [], practice: [], curious: [] };

  // Private storage (task 2, 2026-09-23, see DECISIONS.md).
  // resolvePostImages() drops any image whose signed URL couldn't be
  // resolved, so its output can be shorter than its input — pairing by
  // the resolved image's own `id` (not by array index) is what keeps
  // each photo matched to the right post despite that.
  const [profileAvatarUrl, postAvatarUrls, veilEnabled] = await Promise.all([
    resolveAvatarUrl(user.avatarUrl),
    resolveAvatarUrls(posts.map((p) => p.author.avatarUrl)),
    viewer ? getVeilEnabled(viewer.id) : Promise.resolve(false),
  ]);
  const resolvedPosts = await Promise.all(
    posts.map(async (post, i) => ({
      ...post,
      images: await resolvePostImages(post.images),
      author: { ...post.author, avatarUrl: postAvatarUrls[i] },
    })),
  );

  const allImages = posts.flatMap((p) => p.images.map((img) => ({ postId: p.id, image: img })));
  const postIdByImageId = new Map(allImages.map((i) => [i.image.id, i.postId]));
  const resolvedImages = await resolvePostImages(allImages.map((i) => i.image));
  const photos = resolvedImages.map((img) => ({ postId: postIdByImageId.get(img.id)!, imageUrl: img.url }));

  const pendingBondsResolved = await Promise.all(
    pendingBonds.map(async (b) => ({
      id: b.id,
      kind: b.kind,
      createdAt: b.createdAt.toISOString(),
      fromUser: { ...b.fromUser, avatarUrl: await resolveAvatarUrl(b.fromUser.avatarUrl) },
    })),
  );

  const aboutContent = (
    <div>
      {PRACTICES_UI_ENABLED ? <PracticesRows practices={practices} /> : null}

      {user.bio ? <p className="text-body mt-6">{user.bio}</p> : null}

      {memberships.length > 0 ? (
        <section className="mt-10">
          <p className="text-label mb-3">Houses</p>
          <ul className="flex flex-wrap gap-2">
            {memberships.map((m) => (
              <li key={m.id}>
                <a
                  href={`/houses/${m.house.slug}`}
                  className="text-caption inline-block rounded-ob border px-3 py-1.5 uppercase tracking-brand"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  {m.house.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {viewer && !isOwnProfile && REVIEWS_UI_ENABLED ? (
        <section className="mt-10">
          <p className="text-label mb-3">Leave a Review</p>
          <ReviewForm reviewedId={user.id} />
        </section>
      ) : null}

      {isOwnProfile && REP_HISTORY_UI_ENABLED ? (
        <section className="mt-10">
          <p className="text-label mb-3">REP History</p>
          {repHistory.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No REP events yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {repHistory.map((h) => (
                <li key={h.id} className="card flex items-center justify-between gap-4 !py-3">
                  <div>
                    <p className="text-data !text-sm">{h.reason ?? h.source ?? "REP event"}</p>
                    <p className="text-caption" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(h.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
                    </p>
                  </div>
                  <p
                    className="text-data shrink-0"
                    style={{ color: h.delta >= 0 ? "var(--color-success)" : "var(--color-error)" }}
                  >
                    {h.delta >= 0 ? `+${h.delta}` : h.delta}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {REVIEWS_UI_ENABLED ? (
        <section className="mt-10">
          <p className="text-label mb-3">Reviews</p>
          {reviews.length === 0 ? (
            <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
              No reviews yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="text-data">{r.reviewer.displayName}</p>
                    <p aria-label={`${r.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={i < r.rating ? "star-filled" : "star-empty"}>
                          ★
                        </span>
                      ))}
                    </p>
                  </div>
                  {r.comment ? <p className="text-body mt-2 !text-base">{r.comment}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );

  // "Posts" tab (Package 4, follow-up, 2026-10-13, see DECISIONS.md) —
  // every published post, text-only included, same PostCard the old
  // flat layout used. Restores reachability the Phase B-only About/
  // Photos split had lost for a text-only post.
  const postsContent =
    resolvedPosts.length === 0 ? (
      <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
        No posts yet.
      </p>
    ) : (
      <div className="space-y-6">
        {resolvedPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post as FeedPost}
            viewerId={viewer?.id}
            viewerIsAdmin={viewer?.isAdmin}
            viewerVeilEnabled={veilEnabled}
          />
        ))}
      </div>
    );

  return (
    <main className="min-h-screen bg-ob-black px-6 pb-16 pt-4 text-ob-text">
      <div className="mx-auto max-w-2xl">
        <ZoomableAvatar
          avatarUrl={profileAvatarUrl}
          displayName={user.displayName}
          className={`avatar h-24 w-24 ${LEVELS_UI_ENABLED && !isFounder(user.id) ? `avatar-level-${user.level}` : ""}`}
        />

        <h1 className="text-h1 mt-6">
          {user.displayName}
          {viewer?.isAdmin && user.isTest ? (
            <span
              className="text-caption ml-2 rounded-ob border px-1.5 py-0.5 align-middle uppercase tracking-brand"
              style={{ borderColor: "var(--color-warning)", color: "var(--color-warning)" }}
            >
              Test
            </span>
          ) : null}
        </h1>
        <p className="text-data" style={{ color: "var(--color-text-secondary)" }}>
          @{user.username}
        </p>
        {/* Level + REP, one muted line under the name — same treatment
            as /hall (see that page's 2026-09-27 comment): no card, no
            separate "REP" label, sized like the old level line, not
            larger than the name. */}
        {(LEVELS_UI_ENABLED && !isFounder(user.id)) || REP_NUMBER_ENABLED ? (
          <p
            className="font-cinzel uppercase tracking-brand mt-1 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {LEVELS_UI_ENABLED && !isFounder(user.id) ? LEVEL_NAMES[user.level] ?? `Level ${user.level}` : null}
            {LEVELS_UI_ENABLED && !isFounder(user.id) && REP_NUMBER_ENABLED ? " · " : null}
            {REP_NUMBER_ENABLED ? `${isFounder(user.id) ? "∞" : user.rep} REP` : null}
          </p>
        ) : null}

        {/* Member № (Profile lite, B1, Package 4, Phase B, 2026-10-13,
            see DECISIONS.md) — "Founder" for Lord Obsidian, never a
            number. */}
        <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
          {formatMemberNumber(user.memberNumber, isFounder(user.id))}
        </p>

        {REVIEWS_UI_ENABLED ? (
          <div className="mt-3 flex items-center gap-4">
            <p aria-label={`${stars} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < stars ? "star-filled" : "star-empty"}>
                  ★
                </span>
              ))}
            </p>
          </div>
        ) : null}

        {/* City only when the owner's own Boundaries allow it
            (lib/dm/boundaries.ts — off by default, Package 4, Phase A,
            2026-10-13, see DECISIONS.md) — reverses the previous
            always-shown-if-set behavior. */}
        {ownerBoundaries.showCity && (user.locationCity || user.locationCountry) ? (
          <p className="text-caption mt-4" style={{ color: "var(--color-text-secondary)" }}>
            {[user.locationCity, user.locationCountry].filter(Boolean).join(", ")}
            {memberSince ? ` · Member since ${memberSince}` : ""}
          </p>
        ) : memberSince ? (
          <p className="text-caption mt-4" style={{ color: "var(--color-text-secondary)" }}>
            Member since {memberSince}
          </p>
        ) : null}

        <BondsList bonds={bonds} canDissolve={isOwnProfile} />

        {/* Nullable username (2026-09-25, see DECISIONS.md) — invitedBy/
            partner are other members, who could in principle be an
            admin without a username. No profile to link to in that
            case, so this renders unlinked instead of a link to a
            broken/empty URL. */}
        {user.invitedBy ? (
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            Invited by{" "}
            {user.invitedBy.username ? (
              <a href={`/profile/${user.invitedBy.username}`} style={{ color: "var(--color-text-secondary)" }}>
                {user.invitedBy.displayName}
              </a>
            ) : (
              <span style={{ color: "var(--color-text-secondary)" }}>{user.invitedBy.displayName}</span>
            )}
          </p>
        ) : null}

        {partner ? (
          <p className="text-caption mt-1" style={{ color: "var(--color-text-muted)" }}>
            Partner of{" "}
            {partner.username ? (
              <a href={`/profile/${partner.username}`} style={{ color: "var(--color-text-secondary)" }}>
                {partner.displayName}
              </a>
            ) : (
              <span style={{ color: "var(--color-text-secondary)" }}>{partner.displayName}</span>
            )}
          </p>
        ) : null}

        {isOwnProfile ? (
          <a href="/profile/edit" className="btn-ghost mt-6 inline-block">
            Edit profile
          </a>
        ) : null}

        {viewer && !isOwnProfile ? (
          <div className="mt-6 flex items-center gap-4">
            <FollowButton userId={user.id} initialFollowing={Boolean(isFollowing)} />
            <ContentMenu
              targetType="profile"
              targetId={user.id}
              preview={user.displayName}
              canReport
              blockUserId={user.id}
              blockInitialBlocked={false}
            />
          </div>
        ) : null}

        {/* Direct Messages (2026-09-14, item 1) — state (start / pending
            either direction / existing thread / hidden/closed) computed
            by lib/dm/relationship.ts#getMessageButtonState; the API
            re-checks everything else (two-strike door, daily limit,
            Boundaries) regardless, this just avoids showing a button
            that would always reject outright, or the wrong shape of
            button (item 2, 2026-09-20, see DECISIONS.md). */}
        {viewer && !isOwnProfile && messageButtonState && messageButtonState.type !== "hidden" ? (
          <div className="mt-4">
            <MessageButton
              initialState={messageButtonState}
              recipientId={user.id}
              returnTo={`/profile/${user.username}`}
            />
          </div>
        ) : null}

        {viewer && !isOwnProfile && !existingBondWithViewer ? (
          <div className="mt-4">
            <BondRequestButton toUserId={user.id} />
          </div>
        ) : null}

        {isOwnProfile ? <PendingBondRequests initialRequests={pendingBondsResolved} /> : null}

        <ProfileTabs about={aboutContent} posts={postsContent} photos={<ProfilePhotoGrid photos={photos} />} />

        {viewer && !isOwnProfile ? <PrivateNoteEditor subjectId={user.id} initialBody={privateNote} /> : null}
      </div>
    </main>
  );
}
