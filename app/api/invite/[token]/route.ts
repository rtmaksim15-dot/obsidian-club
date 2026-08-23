// LEGACY — frozen as of the Invitation Panel flow (A1, 2026-08-2x, see
// DECISIONS.md). No new `Waitlist.inviteToken` is ever generated again
// (the applications queue now mints an `InviteToken`, redeemed at
// /join/[token] instead — see app/api/admin/applications/[id]/route.ts
// and app/api/join/[token]/route.ts). This route stays alive, untouched,
// permanently: at least one real, live, unredeemed old-style invite link
// exists in production and must keep working. Do not delete this file.
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/auth/supabase-admin";
import { generateReferralCode, generateUsernameFromEmail } from "@/lib/utils/codes";
import { awardRep, REP_TABLE } from "@/lib/rating/rep-engine";
import { track } from "@/lib/analytics/track";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { recordLegalConsent } from "@/lib/legal/record-consent";

// Supabase's Admin API has intermittently returned a transient
// "unrecognized JWT kid" / bad_jwt error on individual admin calls in
// this project (observed directly while building this route: the exact
// same call, same credentials, succeeds when retried immediately after)
// — looks like JWKS cache staleness on whichever edge node a given
// request lands on, not a real auth failure. One immediate retry clears
// it every time it's been seen; worth having here since these admin
// calls are the one irreversible step in this route.
async function withRetry<R extends { error: unknown }>(fn: () => Promise<R>): Promise<R> {
  const first = await fn();
  if (!first.error) return first;
  return fn();
}

// The SDK's admin API has no getUserByEmail — only paginated listUsers().
// Used when createUser 409s with "email_exists" (see below): a common,
// real path here, not an edge case — anyone who tried "Continue with
// Google" before being approved already has an auth.users row (Supabase
// creates one on a successful OAuth exchange regardless of whether
// app/auth/callback/route.ts finds a matching member — see that file),
// and app member counts are small enough that a full page scan is fine.
async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await withRetry(() => admin.auth.admin.listUsers({ page, perPage: 200 }));
    if (error) {
      console.error("[invite] listUsers failed while looking up an existing auth identity:", error);
      return null;
    }
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

type Body = {
  name?: string;
  password?: string;
  ageConfirmed?: boolean;
  termsAccepted?: boolean;
  aupAccepted?: boolean;
};

// POST /api/invite/:token — redeems a one-time invite token (Closed
// Registration & Invite System, 2026-07-17): creates the real account
// (Supabase Auth user + `public.users` row) only now, at the moment the
// invitee actually sets a password — not at the admin's Approve click
// (see app/api/admin/applications/[id]/route.ts's comment for why).
// Marks the token used, signs the new member in immediately (collecting
// cookies the same way app/auth/callback/route.ts does, since a manually
// -built NextResponse doesn't inherit cookies written via next/headers).
// Block 2 (August hardening pass, 2026-08-04): 10 attempts per hour per
// IP. The token itself (24 random bytes) is infeasible to brute-force —
// this guards against abuse of the account-creation path itself
// (repeated Supabase Auth calls, resource exhaustion), not password
// guessing.
const RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const rateLimit = await checkRateLimit(`invite-redeem:${getClientIp(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const application = await prisma.waitlist.findUnique({ where: { inviteToken: params.token } });
  if (!application) {
    return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  }
  if (application.status !== "approved") {
    return NextResponse.json({ error: "This invite is no longer valid." }, { status: 410 });
  }
  if (application.inviteTokenUsedAt) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const password = body.password;
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 422 });
  }
  // Registration consent (Block 4, 2026-08-10) — same server-side
  // re-check as app/api/join/[token]/route.ts.
  if (!body.ageConfirmed || !body.termsAccepted || !body.aupAccepted) {
    return NextResponse.json({ error: "You must accept all three agreements to continue." }, { status: 422 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: created, error: createError } = await withRetry(() =>
    supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password,
      email_confirm: true,
    }),
  );

  let authUserId: string;
  let linkedExistingIdentity = false;

  if (createError?.code === "email_exists") {
    // The invitee already has a Supabase Auth identity — almost always
    // from an earlier "Continue with Google" attempt made before they
    // were approved (that always succeeds at the Auth layer even when
    // app/auth/callback/route.ts rejects them as a non-member and sends
    // them to /apply). Link the invite to that existing identity
    // instead of failing: set the password they just chose on it, so
    // email/password login works going forward alongside whatever OAuth
    // provider they originally used, then continue exactly as if
    // createUser had succeeded.
    const existing = await findAuthUserByEmail(supabaseAdmin, application.email);
    if (!existing) {
      console.error("[invite] email_exists but couldn't find the matching auth user:", application.email);
      return NextResponse.json(
        { error: "Could not create your account. Try again shortly." },
        { status: 503 }
      );
    }
    const { data: updated, error: updateError } = await withRetry(() =>
      supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      }),
    );
    if (updateError || !updated?.user) {
      console.error("[invite] Failed to set a password on the existing auth user:", updateError);
      return NextResponse.json(
        { error: "Could not create your account. Try again shortly." },
        { status: 503 }
      );
    }
    authUserId = updated.user.id;
    linkedExistingIdentity = true;
  } else if (createError || !created?.user) {
    console.error("[invite] Failed to create Supabase Auth user:", createError);
    return NextResponse.json(
      { error: "Could not create your account. Try again shortly." },
      { status: 503 }
    );
  } else {
    authUserId = created.user.id;
  }

  // Referral resolution (PRODUCT.md §6 "Trust Chain"): if the applicant
  // entered a code that matches a real member's referralCode, this is a
  // real invite, not just a free-text field — link it.
  const inviter = application.referralCode
    ? await prisma.user.findUnique({ where: { referralCode: application.referralCode } })
    : null;

  // The Supabase Auth identity (new or existing) is settled at this
  // point. If the Prisma writes below fail, we're left with an
  // auth.users row and no matching public.users row — same
  // reconciliation gap the old approve-time flow had; logged loudly.
  // See TECH_DEBT.md.
  let newUserId: string;
  try {
    newUserId = authUserId;

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: newUserId,
          email: application.email,
          username: generateUsernameFromEmail(application.email),
          displayName: name,
          age: application.age,
          ageVerified: application.ageVerified,
          ageVerifiedAt: application.ageVerifiedAt,
          locationCity: application.city,
          level: 1,
          status: "active",
          isAdmin: false,
          referralCode: generateReferralCode(),
          invitedById: inviter?.id,
          joinedAt: new Date(),
        },
      }),
      prisma.userProfile.create({
        data: { userId: newUserId },
      }),
      prisma.notification.create({
        data: {
          userId: newUserId,
          type: "welcome",
          title: "Your access has been granted",
          body: "Complete your profile to begin.",
        },
      }),
      prisma.waitlist.update({
        where: { id: application.id },
        data: { inviteTokenUsedAt: new Date() },
      }),
      ...(inviter
        ? [
            prisma.referral.create({
              data: {
                inviterId: inviter.id,
                invitedId: newUserId,
                codeUsed: application.referralCode,
                status: "joined",
              },
            }),
            prisma.user.update({
              where: { id: inviter.id },
              data: { referralCount: { increment: 1 } },
            }),
          ]
        : []),
    ]);

    await track({
      userId: user.id,
      type: "auth.signup",
      meta: { provider: linkedExistingIdentity ? "invite-linked-existing" : "invite" },
    });

    await recordLegalConsent(user.id, getClientIp(request));

    // CLAUDE.md (2026-07-05) REP bonuses — side effects, not the main
    // job, never allowed to fail the request.
    await awardRep(user.id, REP_TABLE.earn.verificationPassed.points, "Verification passed", "verification").catch(
      (err) => console.error("[invite] Failed to award verification-passed REP:", err),
    );
    if (inviter) {
      await awardRep(
        inviter.id,
        REP_TABLE.earn.invitedNewMember.points,
        "Invited a new member",
        `invited-new-member:${user.id}`,
      ).catch((err) => console.error("[invite] Failed to award invited-new-member REP:", err));
    }
  } catch (err) {
    console.error(
      `[invite] Settled ${application.email} in Supabase Auth (user id ${authUserId}) but failed to write the matching rows — needs manual reconciliation:`,
      err
    );
    return NextResponse.json(
      { error: "Account partially created. This needs manual follow-up." },
      { status: 503 }
    );
  }

  // Sign the new member in immediately — collect cookies via a custom
  // setAll rather than lib/auth/supabase-server.ts's createClient(),
  // whose next/headers-based cookie writes don't attach to a manually
  // -returned NextResponse (see app/auth/callback/route.ts).
  let cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookiesToSet = cookies;
        },
      },
    },
  );
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: application.email,
    password,
  });
  if (signInError) {
    console.error("[invite] Account created but sign-in failed:", signInError);
    // The account is real; they can still log in manually at /login.
    return NextResponse.json({ ok: true, signedIn: false, newUserId });
  }

  const response = NextResponse.json({ ok: true, signedIn: true, newUserId });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
