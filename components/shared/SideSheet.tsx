"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: "left" | "right";
  title: string;
  children: React.ReactNode;
};

// Shared slide-in drawer shell for THE WORLD (left) and MINE (right) —
// Navigation v2, B7 (2026-10-10, see DECISIONS.md). First real use of
// @radix-ui/react-dialog in this app (installed but unused everywhere
// else — see Lightbox.tsx's own comment on why it stayed hand-rolled
// there). Used here specifically because B7 requires a REAL focus trap,
// not just an Escape listener + backdrop click (the ConfirmDialog/
// Lightbox/ReportModal pattern) — Radix's Dialog.Content already does
// this correctly (FocusScope, close on Escape, close on outside
// pointer-down), which is exactly the part worth not re-implementing
// by hand. Body scroll lock is still done explicitly below (same
// scrollbar-width-compensated technique as Lightbox.tsx) rather than
// relying on Radix's own, so the behavior here matches the rest of
// this app's overlays byte-for-byte.
export default function SideSheet({ open, onOpenChange, side, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  // Tailwind's JIT scanner needs complete, static class strings — it
  // can't see a class name assembled from an interpolated fragment, so
  // the two sides are spelled out in full here rather than built from
  // a shared template.
  const panelClassName =
    side === "left"
      ? "fixed inset-y-0 left-0 z-50 flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto bg-ob-dark outline-none transition-transform duration-200 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0"
      : "fixed inset-y-0 right-0 z-50 flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto bg-ob-dark outline-none transition-transform duration-200 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content aria-describedby={undefined} className={panelClassName} style={{ borderInline: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
            <Dialog.Title className="font-cinzel text-sm uppercase tracking-brand text-ob-text">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={20} strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div className="flex-1 px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
