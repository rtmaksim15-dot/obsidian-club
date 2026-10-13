type Photo = { postId: string; imageUrl: string };

// Profile lite, B5 (Package 4, Phase B, 2026-10-13, see DECISIONS.md) —
// the "Photos" tab: every image from the member's own published posts,
// newest post first, each linking back to its post. A plain grid, not
// the full post-card list the old flat layout showed — that's what
// "Photos" (a dedicated tab, distinct from "About") asked for.
export default function ProfilePhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <p className="text-body" style={{ color: "var(--color-text-secondary)" }}>
        No photos yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {photos.map((photo, i) => (
        <a key={`${photo.postId}-${i}`} href={`/posts/${photo.postId}`} className="nav-control block aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.imageUrl} alt="" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
