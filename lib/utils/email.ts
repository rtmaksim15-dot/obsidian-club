import { Resend } from "resend";

// Transactional emails. Email clients don't reliably load custom fonts or
// read CSS variables, so brand colors are inlined here as literal hex —
// this file is the one deliberate exception to "no hardcoded hex"
// (DESIGN.md rule), scoped to email markup only.

const FROM = "Obsidian Club <hello@obsidianclub.com>";

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
 * Sends the "access granted" email on application approval, per
 * PRODUCT.md §1's specified tone. `actionLink` is a Supabase-generated
 * invite link the recipient uses to set their password (see
 * app/api/admin/applications/[id]/route.ts) — this app sends its own
 * branded email rather than relying on Supabase's default invite email
 * template, to keep full control over voice and design.
 */
export async function sendAccessGrantedEmail(email: string, name: string, actionLink: string) {
  const html = emailShell(`
      <p style="color:#EDEAE4;font-size:18px;line-height:1.6;margin:0 0 16px;">
        ${name ? escapeHtml(name) + "," : ""}<br/>your access has been granted.
      </p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 24px;">
        Set your password to enter.
      </p>
      <a href="${actionLink}" style="display:inline-block;background:#8B1A1A;color:#EDEAE4;font-family:Georgia,serif;letter-spacing:2px;text-transform:uppercase;font-size:13px;text-decoration:none;padding:14px 32px;border-radius:2px;">
        Enter
      </a>`);

  await sendEmail(email, "Your access has been granted", html);
}

/** Shared send + defensive-no-op wrapper for every transactional email. */
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" email to`, to);
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error(`[email] Failed to send "${subject}":`, err);
  }
}
