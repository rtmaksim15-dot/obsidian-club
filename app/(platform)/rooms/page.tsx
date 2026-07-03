import ComingSoon from "@/components/shared/ComingSoon";

// Real Rooms (chat, local circles) are BACKLOG.md's v0.4 — this exists
// only so the bottom nav (DESIGN.md §8) doesn't dead-end. No room data
// is fabricated here.
export default function RoomsPage() {
  return (
    <ComingSoon
      title="Rooms"
      note="Where the club gathers. Opening in a future version."
    />
  );
}
