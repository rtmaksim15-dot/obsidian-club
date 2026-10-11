import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import type { AgeVerificationProvider, SessionResult } from "./types";

// Local stand-in for Yoti (A3) — no external network call at all.
// `createSession` just mints an id and points at our own
// /verify/mock/[sessionId] page, where a human (or an automated test)
// clicks "Simulate pass"/"Simulate fail". That click calls
// POST /api/age-verification/mock/[sessionId], which writes the
// outcome directly onto this attempt's AgeVerification row — so
// `getResult` below has nothing of its own to track; the row IS the
// mock's state. lib/age-verification/index.ts refuses to select this
// provider when NODE_ENV=production (A3's explicit requirement).
export const mockProvider: AgeVerificationProvider = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-required param, unused by this stand-in
  async createSession(_userId: string) {
    const sessionId = `mock_${crypto.randomUUID()}`;
    return { sessionId, redirectUrl: `/verify/mock/${sessionId}` };
  },

  async getResult(sessionId: string): Promise<SessionResult> {
    const row = await prisma.ageVerification.findUnique({
      where: { providerSessionId: sessionId },
      select: { status: true, method: true },
    });
    if (!row) return { status: "pending" };
    return {
      status: row.status,
      method: (row.method as SessionResult["method"]) ?? undefined,
    };
  },

  // The mock provider has no real webhook — Yoti's webhook route
  // rejects anything it receives while the mock provider is active
  // (see app/api/age-verification/webhook/route.ts).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- interface-required param, unused by this stand-in
  async verifyWebhook(_request: Request) {
    return false;
  },
};
