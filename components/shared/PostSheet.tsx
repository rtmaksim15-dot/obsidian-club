"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Camera, Lock } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Navigation v2, B3 (2026-10-10, see DECISIONS.md) — the bottom tab
// bar's center [+] opens this instead of navigating straight to
// /compose, since "Write a Chronicle"/"Host a Gathering" need
// somewhere to show as disabled-with-"Soon" (neither feature exists
// yet — see WorldDrawer.tsx's CHRONICLES_UI_ENABLED/GATHERINGS_UI_ENABLED).
export default function PostSheet({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 rounded-t-ob bg-ob-dark p-5 outline-none transition-transform duration-200 data-[state=closed]:translate-y-full data-[state=open]:translate-y-0"
          style={{ borderTop: "1px solid var(--color-border)", paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
        >
          <Dialog.Title className="font-cinzel text-sm uppercase tracking-brand text-ob-text mb-4">Post</Dialog.Title>

          <a href="/compose" className="flex items-center gap-3 py-3 text-body">
            <Camera size={20} strokeWidth={1.5} />
            Post a photo
          </a>
          <p className="flex items-center gap-3 py-3 text-body" style={{ color: "var(--color-text-muted)" }}>
            <Lock size={16} strokeWidth={1.5} />
            Write a Chronicle <span className="text-caption">Soon</span>
          </p>
          <p className="flex items-center gap-3 py-3 text-body" style={{ color: "var(--color-text-muted)" }}>
            <Lock size={16} strokeWidth={1.5} />
            Host a Gathering <span className="text-caption">Soon</span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
