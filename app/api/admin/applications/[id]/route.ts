import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/auth/supabase-admin";
import { sendAccessGrantedEmail } from "@/lib/utils/email";
import { generateReferralCode, generateUsernameFromEmail } from "@/lib/utils/codes";

type Body = { action?: "approve" | "decline" };

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

  // Supabase Auth user was created successfully at this point. If the
  // Prisma write below fails, we're left with an orphaned auth.users row
  // and no matching public.users row — there's no cross-system
  // transaction to roll both back atomically. Logged loudly so it can be
  // reconciled manually; see TECH_DEBT.md.
  try {
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          id: created.user.id,
          email: application.email,
          username: generateUsernameFromEmail(application.email),
          displayName: application.name ?? application.email.split("@")[0],
          age: application.age,
          locationCity: application.city,
          level: 1,
          status: "active",
          isAdmin: false,
          referralCode: generateReferralCode(),
          joinedAt: new Date(),
        },
      }),
      prisma.waitlist.update({
        where: { id: application.id },
        data: { status: "approved", reviewedAt: new Date(), reviewedBy: admin.id },
      }),
    ]);

    await sendAccessGrantedEmail(
      application.email,
      application.name ?? "",
      created.properties.action_link
    );

    return NextResponse.json({ ok: true, status: "approved", userId: user.id });
  } catch (err) {
    console.error(
      `[admin/applications] Approved ${application.email} in Supabase Auth (user id ${created.user.id}) but failed to write the matching users row — needs manual reconciliation:`,
      err
    );
    return NextResponse.json(
      { error: "Account partially created. This needs manual follow-up." },
      { status: 503 }
    );
  }
}
