import { ApiError, Bindings } from "./types";

const CORE_SECRET_KEYS = ["JWT_SECRET", "CODE_HMAC_SECRET", "APP_SECRET_HMAC_SECRET", "DEVICE_HMAC_SECRET"] as const;
const PLACEHOLDER_SECRET = "replace-with-a-long-random-secret";

export function requireEnv(env: Bindings, key: keyof Bindings): string {
  const value = env[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(500, "CONFLICT", `${String(key)} is not configured`);
  }
  return value.trim();
}

export function validateEnv(env: Bindings): void {
  for (const key of CORE_SECRET_KEYS) {
    const value = requireEnv(env, key);
    if (value === PLACEHOLDER_SECRET) {
      throw new ApiError(500, "CONFLICT", `${key} must not use the example placeholder value`);
    }
  }

  const bootstrapUsername = normalizeOptionalEnv(env.ADMIN_BOOTSTRAP_USERNAME);
  const bootstrapPassword = normalizeOptionalEnv(env.ADMIN_BOOTSTRAP_PASSWORD);
  if ((bootstrapUsername && !bootstrapPassword) || (!bootstrapUsername && bootstrapPassword)) {
    throw new ApiError(500, "CONFLICT", "ADMIN_BOOTSTRAP_USERNAME and ADMIN_BOOTSTRAP_PASSWORD must be configured together");
  }
  if (bootstrapPassword === "change-me-before-use") {
    throw new ApiError(500, "CONFLICT", "ADMIN_BOOTSTRAP_PASSWORD must not use the example placeholder value");
  }
}

function normalizeOptionalEnv(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
