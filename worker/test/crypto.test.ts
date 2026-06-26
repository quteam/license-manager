import { describe, expect, it } from "vitest";
import {
  codeSuffix,
  generateActivationCode,
  hashPassword,
  hmacSha256,
  normalizeCode,
  timingSafeEqual,
  verifyPassword
} from "../src/crypto";

describe("activation code helpers", () => {
  it("generates readable activation codes", () => {
    const code = generateActivationCode();
    expect(code).toMatch(/^LM-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}-[A-Z2-9]{5}$/);
  });

  it("normalizes and exposes only searchable suffix", () => {
    const code = normalizeCode(" lm-abcde-23456-fghij-789kl ");
    expect(code).toBe("LM-ABCDE-23456-FGHIJ-789KL");
    expect(codeSuffix(code)).toBe("J789KL");
  });

  it("creates stable HMAC hashes without exposing the original value", async () => {
    const first = await hmacSha256("secret", "LM-ABCDE");
    const second = await hmacSha256("secret", "LM-ABCDE");
    expect(first).toBe(second);
    expect(first).not.toContain("ABCDE");
    expect(timingSafeEqual(first, second)).toBe(true);
    expect(timingSafeEqual(first, `${second}x`)).toBe(false);
  });

  it("hashes and verifies passwords with Workers-compatible PBKDF2 settings", async () => {
    const result = await hashPassword("admin-password", "fixed-salt");

    expect(result.hash).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.hash).not.toContain("admin-password");
    expect(await verifyPassword("admin-password", result.salt, result.hash)).toBe(true);
    expect(await verifyPassword("wrong-password", result.salt, result.hash)).toBe(false);
  });
});
