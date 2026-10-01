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
  if (!env.DB && !isEdgeOneRuntime(env)) {
    throw new ApiError(500, "CONFLICT", "Database binding DB is not configured");
  }

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

/**
 * 是否运行在 EdgeOne 云函数环境：云函数注入 SCF/TencentCloud 运行时标记；
 * 本地联调 Blob 驱动时可显式设置 EDGEONE_RUNTIME=1。
 */
export function isEdgeOneRuntime(env: Bindings): boolean {
  if (env.EDGEONE_RUNTIME === "1" || env.EDGEONE_RUNTIME === "true") {
    return true;
  }
  const envRecord = env as unknown as Record<string, unknown>;
  for (const marker of [envRecord.TENCENTCLOUD_SCF_FUNCTIONNAME, envRecord.SCF_FUNCTIONNAME]) {
    if (typeof marker === "string" && marker.length > 0) {
      return true;
    }
  }
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const processMarker = globalProcess?.env?.TENCENTCLOUD_SCF_FUNCTIONNAME ?? globalProcess?.env?.SCF_FUNCTIONNAME;
  if (typeof processMarker === "string" && processMarker.length > 0) {
    return true;
  }
  return false;
}

function normalizeOptionalEnv(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
