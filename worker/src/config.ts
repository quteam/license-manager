import { ApiError, Bindings } from "./types";

export function requireEnv(env: Bindings, key: keyof Bindings): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(500, "CONFLICT", `${String(key)} is not configured`);
  }
  return value;
}
