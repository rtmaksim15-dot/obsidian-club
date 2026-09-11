"use client";

// Generic overlay panel used by every zone (Admin Console shell,
// 2026-09-09, see DECISIONS.md). Backdrop + Escape-to-close live at the
// AdminConsole level (one listener, not one per zone) — this component
// is purely presentational: it renders whatever the open row's zone
// passes it, above the list, which stays mounted underneath.
export default function DetailPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-ob-black p-6"
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
