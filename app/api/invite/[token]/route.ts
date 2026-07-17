import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/auth/supabase-admin";
import { generateReferralCode, generateUsernameFromEmail } from "@/lib/utils/codes";
import { awardRep, REP_TABLE } from "@/lib/rating/rep-engine";

type Body = { name?: string; password?: string };

// "safetyRules" needs policy content Max hasn't written yet, so it starts
// explicitly "deferred", never silently faked as complete (see ADR-0013).
// "newcomerRoom" is computed live from message history
// (lib/auth/ritual.ts) and ignores this seed value entirely.
const INITIAL_RITUAL_PROGRESS = {
  newcomerRoom: "deferred",
  safetyRules: "deferred",
};

// POST /api/invite/:token — redeems a one-time invite token (Closed
// Registration & Invite System, 2026-07-17): creates the real account
// (Supabase Auth user + `public.users` row) only now, at the moment the
// invitee actually sets a password — not at the admin's Approve click
// (see app/api/admin/applications/[id]/route.ts's comment for why).
// Marks the token used, signs the new member in immediately (collecting
// cookies the same way app/auth/callback/route.ts does, since a manually
// -built NextResponse doesn't inherit cookies written via next/headers).
export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
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

  const supabaseAdmin = createAdminClient();
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: application.email,
    password,
    email_confirm: true,
  });

  if (createError || !created?.user) {
    console.error("[invite] Failed to create Supabase Auth user:", createError);
    return NextResponse.json(
      { error: "Could not create your account. Try again shortly." },
      { status: 503 }
    );
  }

  // Referral resolution (PRODUCT.md §6 "Trust Chain"): if the applicant
  // entered a code that matches a real member's referralCode, this is a
  // real invite, not just a free-text field — link it.
  const inviter = application.referralCode
    ? await prisma.user.findUnique({ where: { referralCode: application.referralCode } })
    : null;

  // Supabase Auth user was created successfully at this point. If the
  // Prisma writes below fail, we're left with an orphaned auth.users row
  // and no matching public.users row — same reconciliation gap the old
  // approve-time flow had; logged loudly. See TECH_DEBT.md.
  let newUserId: string;
  try {
    newUserId = created.user.id;

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: newUserId,
          email: application.email,
          username: generateUsernameFromEmail(application.email),
          displayName: name,
          age: application.age,
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
        data: { userId: newUserId, ritualProgress: INITIAL_RITUAL_PROGRESS },
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
      `[invite] Created ${application.email} in Supabase Auth (user id ${created.user.id}) but failed to write the matching rows — needs manual reconciliation:`,
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
