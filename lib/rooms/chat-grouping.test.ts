import { describe, expect, it } from "vitest";
import { groupConsecutiveMessages, dayLabel, isSameDay, formatMessageTime } from "./chat-grouping";

type Msg = { id: string; userId: string; createdAt: string };

function msg(id: string, userId: string, isoTime: string): Msg {
  return { id, userId, createdAt: isoTime };
}

describe("groupConsecutiveMessages — B1/B7 grouping boundary", () => {
  it("groups consecutive messages by the same author within 5 minutes into one block", () => {
    const messages = [
      msg("1", "a", "2026-10-14T10:00:00.000Z"),
      msg("2", "a", "2026-10-14T10:02:00.000Z"),
      msg("3", "a", "2026-10-14T10:04:00.000Z"),
    ];
    const groups = groupConsecutiveMessages(messages);
    expect(groups).toHaveLength(1);
    expect(groups[0].messages.map((m) => m.id)).toEqual(["1", "2", "3"]);
  });

  it("exactly 4:59 after the previous message stays in the same group", () => {
    const messages = [
      msg("1", "a", "2026-10-14T10:00:00.000Z"),
      msg("2", "a", "2026-10-14T10:04:59.000Z"),
    ];
    expect(groupConsecutiveMessages(messages)).toHaveLength(1);
  });

  it("5:01 after the previous message starts a new group", () => {
    const messages = [
      msg("1", "a", "2026-10-14T10:00:00.000Z"),
      msg("2", "a", "2026-10-14T10:05:01.000Z"),
    ];
    const groups = groupConsecutiveMessages(messages);
    expect(groups).toHaveLength(2);
  });

  it("an author change always starts a new group, even seconds later", () => {
    const messages = [
      msg("1", "a", "2026-10-14T10:00:00.000Z"),
      msg("2", "b", "2026-10-14T10:00:05.000Z"),
      msg("3", "a", "2026-10-14T10:00:10.000Z"),
    ];
    const groups = groupConsecutiveMessages(messages);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.userId)).toEqual(["a", "b", "a"]);
  });

  it("the threshold is measured from the previous message in the run, not the group's first", () => {
    const messages = [
      msg("1", "a", "2026-10-14T10:00:00.000Z"),
      msg("2", "a", "2026-10-14T10:04:00.000Z"),
      msg("3", "a", "2026-10-14T10:08:00.000Z"), // 4 min after #2, >5 min after #1
    ];
    const groups = groupConsecutiveMessages(messages);
    expect(groups).toHaveLength(1);
    expect(groups[0].messages).toHaveLength(3);
  });

  it("empty input yields no groups", () => {
    expect(groupConsecutiveMessages([])).toEqual([]);
  });
});

describe("dayLabel / isSameDay — B2/B7 day separators", () => {
  const now = new Date("2026-10-14T12:00:00");

  it("today", () => {
    expect(dayLabel(new Date("2026-10-14T08:00:00"), now)).toBe("Today");
  });

  it("yesterday", () => {
    expect(dayLabel(new Date("2026-10-13T23:59:00"), now)).toBe("Yesterday");
  });

  it("an older date renders as 'D Month'", () => {
    expect(dayLabel(new Date("2026-10-12T08:00:00"), now)).toBe("12 October");
  });

  it("isSameDay ignores time of day", () => {
    expect(isSameDay(new Date("2026-10-14T00:00:01"), new Date("2026-10-14T23:59:59"))).toBe(true);
    expect(isSameDay(new Date("2026-10-14T23:59:59"), new Date("2026-10-15T00:00:00"))).toBe(false);
  });
});

describe("formatMessageTime", () => {
  it("renders 24-hour HH:MM with no leading zero on the hour", () => {
    expect(formatMessageTime(new Date("2026-10-14T08:14:00"))).toBe("8:14");
    expect(formatMessageTime(new Date("2026-10-14T20:05:00"))).toBe("20:05");
  });
});
