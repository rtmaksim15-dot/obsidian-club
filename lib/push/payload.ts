// Web Push, Package N1 (2026-10-25, see DECISIONS.md). Pure — no DOM,
// no DB, no web-push SDK — the actual copy rules, kept separate from
// lib/push/send.ts's orchestration so they're unit-testable without
// mocking Prisma or web-push (same "extract pure core, test that"
// pattern this session has used throughout, e.g. admin-stepup-policy.ts,
// lib/photo-viewer/gestures.ts).
export type PushCategory = "message" | "conversation_request" | "reply" | "lord_word";

export type NotificationPreferenceKey = "messages" | "replies" | "lordWord";

// Which of the three toggles on /settings/notifications governs each
// category — "Messages & requests" deliberately covers two distinct
// events (a new DM message AND a new conversation request) under one
// switch, per the task's own spec; "replies" and "lordWord" are each
// their own category 1:1.
export const CATEGORY_PREFERENCE_KEY: Record<PushCategory, NotificationPreferenceKey> = {
  message: "messages",
  conversation_request: "messages",
  reply: "replies",
  lord_word: "lordWord",
};

const DISCREET_TITLE = "Obsidian Club";

const DISCREET_BODY: Record<PushCategory, string> = {
  message: "You have a new message.",
  conversation_request: "Someone wishes to speak with you.",
  reply: "A reply awaits you.",
  lord_word: "The Lord has spoken.",
};

// Non-discreet mode may include the sender's display name — never the
// message text, never an image (the task's own explicit ceiling); this
// is the only place that's actually true, since the title stays the
// fixed "Obsidian Club" in both modes (no "may include" clause in the
// task's own spec covers the title, only the body). The Lord's Word
// broadcast has no individual "sender" to name — it reads the same in
// both modes.
function nonDiscreetBody(category: PushCategory, senderDisplayName: string | null): string {
  if (category === "lord_word") return DISCREET_BODY.lord_word;
  if (!senderDisplayName) return DISCREET_BODY[category];
  switch (category) {
    case "message":
      return `${senderDisplayName} sent you a message.`;
    case "conversation_request":
      return `${senderDisplayName} wishes to speak with you.`;
    case "reply":
      return `${senderDisplayName} replied to your post.`;
  }
}

export type PushPayload = { title: string; body: string; url: string };

export function buildPushPayload(params: {
  category: PushCategory;
  discreet: boolean;
  senderDisplayName?: string | null;
  url: string;
}): PushPayload {
  const body = params.discreet
    ? DISCREET_BODY[params.category]
    : nonDiscreetBody(params.category, params.senderDisplayName ?? null);
  return { title: DISCREET_TITLE, body, url: params.url };
}
