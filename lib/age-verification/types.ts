// 21+ Age Verification Gate, Phase A (2026-10-10, see DECISIONS.md).
// Provider-agnostic shape — lib/age-verification/index.ts is the only
// thing outside this directory allowed to know which provider is
// active. Never add DOB, images, or document fields anywhere in this
// directory: the task's own hard rule is "store only the outcome."

export type AgeVerificationMethod = "age_estimation" | "doc_scan" | "digital_id" | "mock";

export type AgeVerificationResultStatus = "pending" | "passed" | "failed" | "expired" | "cancelled";

export interface CreateSessionResult {
  sessionId: string;
  redirectUrl: string;
}

export interface SessionResult {
  status: AgeVerificationResultStatus;
  method?: AgeVerificationMethod;
}

export interface AgeVerificationProvider {
  createSession(userId: string): Promise<CreateSessionResult>;
  getResult(sessionId: string): Promise<SessionResult>;
  /** Must fail closed: return false whenever the signature can't be positively confirmed. */
  verifyWebhook(request: Request): Promise<boolean>;
}
