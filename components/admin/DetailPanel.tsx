"use client";

// Generic detail panel used by every zone (Admin Console shell,
// 2026-09-09, see DECISIONS.md). Backdrop + Escape-to-close live at the
// AdminConsole level (one listener, not one per zone) — this component
// is purely presentational: it renders whatever the open row's zone
// passes it.
//
// Two layouts, one DOM tree, no duplicate mount (2026-09-13, desktop
// pass): below `lg` this is exactly what it always was — a fixed
// full-viewport overlay with a dark backdrop, anchored to the right,
// closed by Escape or a click on the backdrop. AdminConsole now renders
// this as the second child of a `lg:flex` row instead of `main`'s direct
// sibling, so at `lg` and up the `lg:static` here simply drops it out of
// fixed positioning and into that row as a normal column next to the
// list — no backdrop, no overlay, both visible at once. Doing this with
// responsive classes on one element (rather than rendering the detail
// children twice for two breakpoints) avoids mounting `ApplicationDetail`/
// `PersonDetail`/etc twice, which would otherwise split their own local
// state (a note draft, a pending-request flag) across two live instances.
export default function DetailPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 lg:static lg:z-auto lg:w-[26rem] lg:shrink-0 lg:bg-transparent"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-ob-black p-6 lg:sticky lg:top-10 lg:h-auto lg:max-w-none lg:max-h-[calc(100vh-5rem)]"
        style={{ borderLeft: "1px solid var(--color-border)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="text-caption mb-4 self-end"
          style={{ color: "var(--color-text-muted)" }}
        >
          Close (Esc)
        </button>
        {children}
      </div>
    </div>
  );
}
