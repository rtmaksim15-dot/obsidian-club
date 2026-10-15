import { describe, expect, it } from "vitest";
import { hashIp } from "./ip-hash";

describe("hashIp", () => {
  it("is deterministic for the same ip + secret", async () => {
    const a = await hashIp("203.0.113.42", "secret-a");
    const b = await hashIp("203.0.113.42", "secret-a");
    expect(a).toBe(b);
  });

  it("differs for a different ip under the same secret", async () => {
    const a = await hashIp("203.0.113.42", "secret-a");
    const b = await hashIp("203.0.113.43", "secret-a");
    expect(a).not.toBe(b);
  });

  it("differs for the same ip under a different secret (not reversible without the secret)", async () => {
    const a = await hashIp("203.0.113.42", "secret-a");
    const b = await hashIp("203.0.113.42", "secret-b");
    expect(a).not.toBe(b);
  });

  it("returns a 32-char lowercase hex string", async () => {
    const hash = await hashIp("203.0.113.42", "secret-a");
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });
});
