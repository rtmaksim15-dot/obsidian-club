"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a scrollable message list pinned to its latest item as new ones
 * arrive, unless the member has scrolled up to read history — shared by
 * RoomChat and DmThreadChat (2026-09-24, see DECISIONS.md) so this
 * behavior can't drift between the two again (Room chat previously
 * always force-scrolled on every new message, with no "unless scrolled
 * up" check at all).
 *
 * `pinnedToBottomRef` is a ref, not state: it only needs to be read
 * inside the effect below, so tracking it in state would cost an extra
 * render per scroll event for no benefit.
 */
export function useStickToBottom(itemCount: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 80;
  }

  useEffect(() => {
    if (pinnedToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [itemCount]);

  return { listRef, bottomRef, handleListScroll };
}
