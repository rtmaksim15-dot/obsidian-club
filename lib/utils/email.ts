import { Resend } from "resend";

// Transactional emails. Email clients don't reliably load custom fonts or
// read CSS variables, so brand colors are inlined here as literal hex —
// this file is the one deliberate exception to "no hardcoded hex"
// (DESIGN.md rule), scoped to email markup only.

// obsidianclub.online is this project's one real production domain
// (see NEXT_PUBLIC_APP_URL usage throughout, TECH_DEBT.md, DECISIONS.md) —
// this FROM address previously pointed at the unrelated .com domain,
// a mismatch caught 2026-08-08 while preparing Resend DNS setup
// instructions: the domain verified in Resend has to be the one
// actually used here, or every send fails at the API level.
const FROM = "Obsidian Club <hello@obsidianclub.online>";

function emailShell(bodyHtml: string) {
  return `
  <div style="background:#0A0908;padding:48px 24px;font-family:Georgia,'Times New Roman',serif;color:#9E9A94;">
    <div style="max-width:480px;margin:0 auto;text-align:center;">
      <p style="font-family:Georgia,serif;letter-spacing:6px;text-transform:uppercase;color:#EDEAE4;font-size:20px;margin:0 0 4px;">
        Obsidian Club
      </p>
      <p style="letter-spacing:4px;text-transform:uppercase;color:#8B1A1A;font-size:11px;margin:0 0 32px;">
        Private Community
      </p>
      <hr style="border:none;height:1px;background:#8B1A1A;opacity:0.4;width:120px;margin:0 auto 32px;" />
      ${bodyHtml}
      <p style="font-size:13px;color:#5C5955;margin-top:40px;">
        © ${new Date().getFullYear()} Obsidian Club. All rights reserved.
      </p>
    </div>
  </div>`;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the waitlist confirmation email. No-ops (with a server log) when
 * RESEND_API_KEY isn't configured yet, so the API route keeps working before
 * the Resend account is connected. Never throws — a failed email must not
 * fail the waitlist submission.
 */
export async function sendWaitlistConfirmation(email: string, name: string) {
  const html = emailShell(`
      <p style="color:#EDEAE4;font-size:18px;line-height:1.6;margin:0 0 16px;">
        ${name ? escapeHtml(name) + ",<br/>" : ""}your application has been received.
      </p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">
        Applications are reviewed manually. If you are accepted, you will be
        contacted directly. Not everyone is.
      </p>`);

  await sendEmail(email, "Your application has been received", html);
}

/**
 * Sends the invitation email for an email-channel invite batch (Batch
 * Channels + Email Infra, 2026-08-07) — admin-triggered only, from the
 * CSV-upload flow at `POST /api/admin/invite-batches/:id/send-emails`.
 * No open self-serve sending exists anywhere; this is the only caller.
 *
 * Unlike `sendWaitlistConfirmation`, this returns success/failure
 * instead of swallowing it — the caller logs per-token send status
 * (`InviteToken.emailSentAt`/`emailSendError`), so a real result is
 * needed here rather than a fire-and-forget void.
 */
export async function sendInvitationEmail(
  to: string,
  name: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (!baseUrl) {
    // A join link with no domain is worse than not sending at all —
    // same standing gap as the purchase-card CSV export (TECH_DEBT.md),
    // but for email a broken link goes out to a real inbox instead of
    // just failing quietly in a downloaded file.
    const error = "NEXT_PUBLIC_APP_URL is not set — refusing to send an invite with a broken join link";
    console.error(`[email] ${error}`);
    return { ok: false, error };
  }
  const joinUrl = `${baseUrl}/join/${token}`;
  const logoUrl = `${baseUrl}/images/logo-mark.png`;

  const html = emailShell(`
      <img src="${logoUrl}" alt="" width="54" height="37" style="display:block;margin:0 auto 28px;" />
      <p style="color:#EDEAE4;font-size:18px;line-height:1.6;margin:0 0 16px;">
        ${name ? escapeHtml(name) + ",<br/>" : ""}you have been invited to enter.
      </p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 32px;">
        Obsidian Club is a private circle, open by invitation only. This
        link is yours alone, and it works once.
      </p>
      <a href="${joinUrl}" style="display:inline-block;padding:14px 36px;background:#8B1A1A;color:#EDEAE4;text-decoration:none;letter-spacing:2px;text-transform:uppercase;font-size:13px;">
        Enter the Circle
      </a>`);

  return sendEmail(to, "You have been invited to Obsidian Club", html);
}

/** Shared send + defensive-no-op wrapper for every transactional email. */
async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = "RESEND_API_KEY not set";
    console.warn(`[email] ${error} — skipping "${subject}" email to`, to);
    return { ok: false, error };
  }

  try {
    const resend = new Resend(apiKey);
    // resend.emails.send() does NOT throw on an API-level failure (bad
    // key, invalid recipient, quota...) — it resolves with `{ data:
    // null, error: {...} }` instead (only network-level failures throw).
    // A bare `await` here would silently treat every one of those as
    // success, which is exactly the class of bug this per-token send-
    // status logging exists to prevent — found live while verifying
    // this feature with a deliberately-bad key.
    const { error: sendError } = await resend.emails.send({ from: FROM, to, subject, html });
    if (sendError) {
      console.error(`[email] Failed to send "${subject}":`, sendError);
      return { ok: false, error: sendError.message };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown send error";
    console.error(`[email] Failed to send "${subject}":`, err);
    return { ok: false, error };
  }
}
