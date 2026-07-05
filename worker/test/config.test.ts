import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/config";
import type { Bindings } from "../src/types";

const validEnv = {
  DB: {} as D1Database,
  ASSETS: {} as Fetcher,
  JWT_SECRET: "jwt-secret",
  CODE_HMAC_SECRET: "code-secret",
  APP_SECRET_HMAC_SECRET: "app-secret-secret",
  DEVICE_HMAC_SECRET: "device-secret",
  ADMIN_BOOTSTRAP_USERNAME: "admin",
  ADMIN_BOOTSTRAP_PASSWORD: "recovery-secret"
} as Bindings;

describe("validateEnv", () => {
  it("rejects missing core secrets", () => {
    const env = {
      ...validEnv,
      JWT_SECRET: ""
    };

    expect(() => validateEnv(env)).toThrowError("JWT_SECRET is not configured");
  });

  it("rejects bootstrap configuration when only one side is configured", () => {
    const env = {
      ...validEnv,
      ADMIN_BOOTSTRAP_PASSWORD: undefined
    };

    expect(() => validateEnv(env)).toThrowError("ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD must be configured together");
  });

  it("rejects example placeholder secrets", () => {
    const env = {
      ...validEnv,
      CODE_HMAC_SECRET: "replace-with-a-long-random-secret"
    };

    expect(() => validateEnv(env)).toThrowError("CODE_HMAC_SECRET must not use the example placeholder value");
  });
});
