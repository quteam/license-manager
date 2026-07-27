import { ApiResponse } from "./types";

const TOKEN_KEY = "license_manager_token";
const TENANT_KEY = "license_manager_tenant_id";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TENANT_KEY);
}

export function getTenantId(): number | null {
  const value = localStorage.getItem(TENANT_KEY);
  const tenantId = value ? Number(value) : NaN;
  return Number.isInteger(tenantId) && tenantId > 0 ? tenantId : null;
}

export function setTenantId(tenantId: number): void {
  localStorage.setItem(TENANT_KEY, String(tenantId));
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const tenantId = getTenantId();
  if (tenantId) {
    headers.set("X-Tenant-Id", String(tenantId));
  }
  const response = await fetch(path, {
    ...options,
    headers
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }
  return payload.data;
}

export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
