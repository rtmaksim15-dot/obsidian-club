import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/auth/supabase-admin";
import { sendAccessGrantedEmail } from "@/lib/utils/email";
import { generateReferralCode, generateUsernameFromEmail } from "@/lib/utils/codes";
import { awardRep, REP_TABLE } from "@/lib/rating/rep-engine";

type Body = { action?: "approve" | "decline" };

// "safetyRules" needs policy content Max hasn't written yet, so it starts
// explicitly "deferred", never silently faked as complete (see ADR-0013).
// "newcomerRoom" is computed live from message history
// (lib/auth/ritual.ts) and ignores this seed value entirely. Code of
// Conduct and Lord Obsidian's introduction are real as of 2026-07-15 —
// deliberately NOT seeded here anymore, so new members see them as a
// genuine "todo" from day one instead of a permanently-satisfied
// "deferred" (see lib/auth/ritual.ts).
const INITIAL_RITUAL_PROGRESS = {
  newcomerRoom: "deferred",
  safetyRules: "deferred",
};

// PATCH /api/admin/applications/:id — approve or decline a waitlist entry.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "decline") {
    return NextResponse.json({ error: 'action must be "approve" or "decline".' }, { status: 422 });
  }

  const application = await prisma.waitlist.findUnique({ where: { id: params.id } });
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (application.status !== "pending") {
    return NextResponse.json(
      { error: `Already ${application.status}.` },
      { status: 409 }
    );
  }

  if (body.action === "decline") {
    // PRODUCT.md §1: declines carry no explanation — that opacity is
    // intentional, so no email is sent here.
    await prisma.waitlist.update({
      where: { id: application.id },
      data: { status: "declined", reviewedAt: new Date(), reviewedBy: admin.id },
    });
    return NextResponse.json({ ok: true, status: "declined" });
  }

  // --- approve ---
  const supabaseAdmin = createAdminClient();
  const { data: created, error: createError } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: application.email,
  });

  if (createError || !created?.user) {
    console.error("[admin/applications] Failed to create Supabase Auth user:", createError);
    return NextResponse.json(
      { error: "Could not create the member's account. Try again shortly." },
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
  // and no matching public.users row — there's no cross-system
  // transaction to roll both back atomically. Logged loudly so it can be
  // reconciled manually; see TECH_DEBT.md.
  try {
    const newUserId = created.user.id;

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: newUserId,
          email: application.email,
          username: generateUsernameFromEmail(application.email),
          displayName: application.name ?? application.email.split("@")[0],
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
        data: { status: "approved", reviewedAt: new Date(), reviewedBy: admin.id },
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

    // CLAUDE.md (2026-07-05) REP bonuses: +200 for the new member's
    // verification passing, +300 to the inviter for a verified referral.
    // Side effects, not the main job — never let these fail the request.
    await awardRep(user.id, REP_TABLE.earn.verificationPassed.points, "Verification passed", "verification").catch(
      (err) => console.error("[admin/applications] Failed to award verification-passed REP:", err),
    );
    if (inviter) {
      await awardRep(
        inviter.id,
        REP_TABLE.earn.invitedNewMember.points,
        "Invited a new member",
        `invited-new-member:${user.id}`,
      ).catch((err) => console.error("[admin/applications] Failed to award invited-new-member REP:", err));
    }

    await sendAccessGrantedEmail(
      application.email,
      application.name ?? "",
      created.properties.action_link
    );

    return NextResponse.json({ ok: true, status: "approved", userId: user.id });
  } catch (err) {
    console.error(
      `[admin/applications] Approved ${application.email} in Supabase Auth (user id ${created.user.id}) but failed to write the matching rows — needs manual reconciliation:`,
      err
    );
    return NextResponse.json(
      { error: "Account partially created. This needs manual follow-up." },
      { status: 503 }
    );
  }
}
