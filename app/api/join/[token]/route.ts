import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/auth/supabase-admin";
import { generateReferralCode, generateUsernameFromEmail } from "@/lib/utils/codes";
import { track } from "@/lib/analytics/track";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

// Same transient-JWKS-staleness workaround as app/api/invite/[token]/route.ts.
async function withRetry<R extends { error: unknown }>(fn: () => Promise<R>): Promise<R> {
  const first = await fn();
  if (!first.error) return first;
  return fn();
}

async function findAuthUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await withRetry(() => admin.auth.admin.listUsers({ page, perPage: 200 }));
    if (error) {
      console.error("[join] listUsers failed while looking up an existing auth identity:", error);
      return null;
    }
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

type Body = { name?: string; email?: string; password?: string };

// POST /api/join/:token — redeems a purchase-card, member-invite, or
// partner InviteToken (Invitation & Partner system v1,
// OBSIDIAN_ROADMAP_v3.1, 2026-08-01). Unlike /api/invite/:token (the
// original Waitlist-application flow, untouched), there's no prior
// application and no admin review — redeeming goes straight to account
// creation. All three `source`s share this one route and the exact same
// "already redeemed" check (`redeemedAt` must be null) — there is no
// per-source branch in that check, so a token is permanently invalid
// after use regardless of which of the three created it.
// Block 2 (August hardening pass, 2026-08-04): same shape and reasoning
// as app/api/invite/[token]/route.ts's rate limit.
const RATE_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 };

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const rateLimit = await checkRateLimit(`join-redeem:${getClientIp(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const invite = await prisma.inviteToken.findUnique({ where: { token: params.token } });
  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  }
  if (invite.redeemedAt) {
    return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 422 });
  }

  const existingMember = await prisma.user.findUnique({ where: { email } });
  if (existingMember) {
    return NextResponse.json({ error: "That email is already a member." }, { status: 409 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: created, error: createError } = await withRetry(() =>
    supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true }),
  );

  let authUserId: string;
  let linkedExistingIdentity = false;

  if (createError?.code === "email_exists") {
    // Same real path as /api/invite/:token — a prior "Continue with
    // Google" attempt (pre-membership) already created a Supabase Auth
    // identity for this email. Link this invite to it instead of
    // failing.
    const existing = await findAuthUserByEmail(supabaseAdmin, email);
    if (!existing) {
      console.error("[join] email_exists but couldn't find the matching auth user:", email);
      return NextResponse.json({ error: "Could not create your account. Try again shortly." }, { status: 503 });
    }
    const { data: updated, error: updateError } = await withRetry(() =>
      supabaseAdmin.auth.admin.updateUserById(existing.id, { password, email_confirm: true }),
    );
    if (updateError || !updated?.user) {
      console.error("[join] Failed to set a password on the existing auth user:", updateError);
      return NextResponse.json({ error: "Could not create your account. Try again shortly." }, { status: 503 });
    }
    authUserId = updated.user.id;
    linkedExistingIdentity = true;
  } else if (createError || !created?.user) {
    console.error("[join] Failed to create Supabase Auth user:", createError);
    return NextResponse.json({ error: "Could not create your account. Try again shortly." }, { status: 503 });
  } else {
    authUserId = created.user.id;
  }

  let newUserId: string;
  try {
    newUserId = authUserId;

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: newUserId,
          email,
          username: generateUsernameFromEmail(email),
          displayName: name,
          level: 1,
          status: "active",
          isAdmin: false,
          referralCode: generateReferralCode(),
          joinedAt: new Date(),
          // member: stores who invited them, powering the "Invited by"
          // profile line — deliberately NOT also creating a Referral row
          // or bumping referralCount/Trust Score here; that's the old
          // referral-code system's own trust-chain infra, and wiring
          // these three new sources into it wasn't asked for (see
          // TECH_DEBT.md).
          invitedById: invite.source === "member" ? invite.inviterId : null,
          // partner: the redeemer's partnerId points at whoever created
          // the link; the creator's own `partnerOf` resolves to this
          // new user automatically via Prisma's reverse relation — no
          // separate write needed on the creator's row.
          partnerId: invite.source === "partner" ? invite.partnerOfId : null,
          // Partners don't get invite allowance by default (separate
          // from invites entirely); everyone else keeps the schema
          // default of 1.
          inviteAllowance: invite.source === "partner" ? 0 : undefined,
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
      prisma.inviteToken.update({
        where: { id: invite.id },
        data: { redeemedAt: new Date(), redeemedById: newUserId },
      }),
      // member: the token itself is single-use regardless, but the
      // inviter's allowance is a separate, spendable resource — decrement
      // it now, at redemption, not when the link was created (see
      // DECISIONS.md for why creation doesn't spend it).
      ...(invite.source === "member" && invite.inviterId
        ? [
            prisma.user.update({
              where: { id: invite.inviterId },
              data: { inviteAllowance: { decrement: 1 } },
            }),
          ]
        : []),
    ]);

    await track({
      userId: newUserId,
      type: "auth.signup",
      meta: { provider: linkedExistingIdentity ? `join-linked-existing:${invite.source}` : `join:${invite.source}` },
    });
  } catch (err) {
    console.error(
      `[join] Settled ${email} in Supabase Auth (user id ${authUserId}) but failed to write the matching rows — needs manual reconciliation:`,
      err,
    );
    return NextResponse.json({ error: "Account partially created. This needs manual follow-up." }, { status: 503 });
  }

  // Sign the new member in immediately — same manual cookie-collection
  // shape as /api/invite/:token, for the same reason (a manually-built
  // NextResponse doesn't inherit next/headers cookie writes).
  let cookiesToSet: { name: string; value: string; options: CookieOptionsWithName }[] = [];
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookiesToSet = cookies;
      },
    },
  });
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error("[join] Account created but sign-in failed:", signInError);
    return NextResponse.json({ ok: true, signedIn: false, newUserId });
  }

  const response = NextResponse.json({ ok: true, signedIn: true, newUserId });
  cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
