import { ApiError, ApiFailure, ApiSuccess, ErrorCode } from "./types";

export function ok<T>(data: T): ApiSuccess<T> {
  return {
    ok: true,
    data
  };
}

export function fail(code: ErrorCode, message: string): ApiFailure {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, "BAD_REQUEST", `${name} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function optionalHttpUrl(value: unknown, name: string): string | undefined {
  const normalized = optionalString(value);
  if (!normalized) {
    return undefined;
  }
  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return url.toString();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be a valid http or https URL`);
  }
}

export function requireInteger(value: unknown, name: string, options: { min?: number; max?: number } = {}): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(numeric)) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be an integer`);
  }
  if (options.min !== undefined && numeric < options.min) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be at least ${options.min}`);
  }
  if (options.max !== undefined && numeric > options.max) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be at most ${options.max}`);
  }
  return numeric;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "BAD_REQUEST", "JSON body must be an object");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, "BAD_REQUEST", "Invalid JSON body");
  }
}
