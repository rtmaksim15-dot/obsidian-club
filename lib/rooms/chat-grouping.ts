// Clean Hall, B1/B2 (Package 5, Phase B, 2026-10-14, see DECISIONS.md).
// Pure — no "server-only", used directly from RoomChat.tsx (a client
// component) since "Today"/"Yesterday" and block grouping are
// inherently relative to the viewer's own local clock, not something
// the server could precompute once for everyone.
export const GROUPING_THRESHOLD_MS = 5 * 60 * 1000;

export type ChatMessageLike = { userId: string; createdAt: string };

export type MessageGroup<T extends ChatMessageLike> = {
  userId: string;
  messages: T[];
};

/**
 * B1: consecutive messages by the same author, each within
 * GROUPING_THRESHOLD_MS of the PREVIOUS message in the same run (not
 * of the group's first message — a steady trickle of messages a
 * minute apart stays one block indefinitely, the same way a real chat
 * client groups them), become one block.
 */
export function groupConsecutiveMessages<T extends ChatMessageLike>(
  messages: T[],
  thresholdMs: number = GROUPING_THRESHOLD_MS,
): MessageGroup<T>[] {
  const groups: MessageGroup<T>[] = [];

  for (const message of messages) {
    const current = groups[groups.length - 1];
    const previous = current?.messages[current.messages.length - 1];
    const withinThreshold =
      previous !== undefined &&
      new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <= thresholdMs;

    if (current && current.userId === message.userId && withinThreshold) {
      current.messages.push(message);
    } else {
      groups.push({ userId: message.userId, messages: [message] });
    }
  }

  return groups;
}

/** "8:14" — 24-hour, no AM/PM, matching the task's own example exactly. */
export function formatMessageTime(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** B2: "Today" / "Yesterday" / "12 October" — relative to `now` (the viewer's own local clock). "en-GB" is what actually produces day-before-month order ("12 October"); "en-US" renders "October 12" instead, which doesn't match the task's own example. */
export function dayLabel(date: Date, now: Date = new Date()): string {
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}
