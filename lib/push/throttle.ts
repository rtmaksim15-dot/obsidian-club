// Web Push, Package N1 (2026-10-25, see DECISIONS.md) — the task's own
// spec'd windows, shared across every trigger site so there's one
// number per rule, not four copies that could quietly diverge.
export const PUSH_CONVERSATION_THROTTLE = { max: 1, windowMs: 10 * 60 * 1000 };
export const PUSH_LORD_WORD_THROTTLE = { max: 1, windowMs: 24 * 60 * 60 * 1000 };
