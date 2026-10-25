import { describe, expect, it } from "vitest";
import { buildPushPayload, CATEGORY_PREFERENCE_KEY, type PushCategory } from "./payload";

const CATEGORIES: PushCategory[] = ["message", "conversation_request", "reply", "lord_word"];

describe("buildPushPayload — discreet mode", () => {
  it.each(CATEGORIES)("%s: title is always the fixed club name, never a sender name", (category) => {
    const payload = buildPushPayload({ category, discreet: true, senderDisplayName: "Lord Obsidian", url: "/feed" });
    expect(payload.title).toBe("Obsidian Club");
  });

  it.each(CATEGORIES)("%s: body contains neither the sender's name nor any message/comment text", (category) => {
    const payload = buildPushPayload({
      category,
      discreet: true,
      senderDisplayName: "Someone Identifiable",
      url: "/feed",
    });
    expect(payload.body).not.toContain("Someone Identifiable");
    expect(payload.body.toLowerCase()).not.toContain("secret message content");
  });

  it("gives each category its own fixed, name-free discreet body", () => {
    expect(buildPushPayload({ category: "message", discreet: true, url: "/x" }).body).toBe(
      "You have a new message.",
    );
    expect(buildPushPayload({ category: "conversation_request", discreet: true, url: "/x" }).body).toBe(
      "Someone wishes to speak with you.",
    );
    expect(buildPushPayload({ category: "reply", discreet: true, url: "/x" }).body).toBe("A reply awaits you.");
    expect(buildPushPayload({ category: "lord_word", discreet: true, url: "/x" }).body).toBe("The Lord has spoken.");
  });

  it("discreet mode ignores a provided sender name entirely — identical output with or without one", () => {
    const withName = buildPushPayload({ category: "message", discreet: true, senderDisplayName: "Max", url: "/x" });
    const withoutName = buildPushPayload({ category: "message", discreet: true, senderDisplayName: null, url: "/x" });
    expect(withName).toEqual(withoutName);
  });
});

describe("buildPushPayload — non-discreet mode", () => {
  it("may include the sender's display name in the body", () => {
    const payload = buildPushPayload({ category: "message", discreet: false, senderDisplayName: "Max", url: "/x" });
    expect(payload.body).toContain("Max");
  });

  it("falls back to the discreet body when no sender name is available", () => {
    const payload = buildPushPayload({ category: "reply", discreet: false, senderDisplayName: null, url: "/x" });
    expect(payload.body).toBe("A reply awaits you.");
  });

  it("lord_word never includes a name even in non-discreet mode — there's no individual sender", () => {
    const payload = buildPushPayload({
      category: "lord_word",
      discreet: false,
      senderDisplayName: "Lord Obsidian",
      url: "/x",
    });
    expect(payload.body).toBe("The Lord has spoken.");
  });

  it("the title stays the fixed club name even in non-discreet mode", () => {
    const payload = buildPushPayload({ category: "message", discreet: false, senderDisplayName: "Max", url: "/x" });
    expect(payload.title).toBe("Obsidian Club");
  });
});

describe("buildPushPayload — url passthrough", () => {
  it("carries the given url through unchanged, for either mode", () => {
    expect(buildPushPayload({ category: "reply", discreet: true, url: "/posts/123" }).url).toBe("/posts/123");
    expect(buildPushPayload({ category: "reply", discreet: false, url: "/posts/123" }).url).toBe("/posts/123");
  });
});

describe("CATEGORY_PREFERENCE_KEY", () => {
  it("messages and conversation requests share the one 'messages' toggle", () => {
    expect(CATEGORY_PREFERENCE_KEY.message).toBe("messages");
    expect(CATEGORY_PREFERENCE_KEY.conversation_request).toBe("messages");
  });

  it("replies and lord_word each have their own toggle", () => {
    expect(CATEGORY_PREFERENCE_KEY.reply).toBe("replies");
    expect(CATEGORY_PREFERENCE_KEY.lord_word).toBe("lordWord");
  });
});
