// Profile lite, B6 (Package 4, Phase B, 2026-10-13, see DECISIONS.md).
// Pure — no "server-only", no Prisma. Used by app/api/profile/route.ts
// to validate the existing `bio` field (renamed "About text" in the
// Profile lite layout — same column, not a new one; see DECISIONS.md
// for why the limit changed 300 -> 600 along with this).
export const MAX_ABOUT_LENGTH = 600;

const URL_PATTERN = /\bhttps?:\/\/\S+|\bwww\.[a-z0-9-]+\.[a-z]{2,}\S*/i;
const BARE_DOMAIN_PATTERN = /\b[a-z0-9-]+\.(com|net|org|io|me|co|ru|info|xyz|club|app|to)\b/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
// At least 8 digits total, separators (space/dash/dot/parens) allowed
// between them — deliberately generous (a short run of digits, e.g. a
// year or an age, must not trip this; a real phone number is at least
// this long in any format this app's membership is likely to use).
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){8,}/;
const HANDLE_PATTERN = /@[a-zA-Z0-9_]{3,}/;
const MESSENGER_KEYWORD_PATTERN = /\b(telegram|whatsapp|signal|snapchat|instagram|insta|kik|discord|wechat|viber|skype)\b/i;

export function containsContactInfo(text: string): boolean {
  return (
    URL_PATTERN.test(text) ||
    BARE_DOMAIN_PATTERN.test(text) ||
    EMAIL_PATTERN.test(text) ||
    PHONE_PATTERN.test(text) ||
    HANDLE_PATTERN.test(text) ||
    MESSENGER_KEYWORD_PATTERN.test(text)
  );
}

export type AboutTextValidation = { ok: true } | { ok: false; error: string };

const CONTACT_INFO_ERROR = "Contacts and links are not shared here. Use messages.";

export function validateAboutText(text: string): AboutTextValidation {
  if (text.length > MAX_ABOUT_LENGTH) {
    return { ok: false, error: `About text must be ${MAX_ABOUT_LENGTH} characters or fewer.` };
  }
  if (containsContactInfo(text)) {
    return { ok: false, error: CONTACT_INFO_ERROR };
  }
  return { ok: true };
}
