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

/** 仅清理登录凭证、保留租户选择：会话过期后重新登录仍回到原租户 */
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
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
  // 带 token 的请求返回 401 说明会话已失效：清理登录态并回到登录页
  if (response.status === 401 && token) {
    handleSessionExpired();
  }
  const payload = await parseResponse<T>(response);
  if (!payload.ok) {
    throw new Error(payload.error.message || payload.error.code);
  }
  return payload.data;
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(`请求失败（HTTP ${response.status}）`);
  }
}

/** 会话失效：清理凭证并重载页面回到登录态（保留租户选择；短时间内只重载一次，避免启动检查反复刷新） */
function handleSessionExpired(): void {
  clearSession();
  const key = "license_manager_auth_redirect_at";
  const now = Date.now();
  const last = Number(sessionStorage.getItem(key) ?? 0);
  if (now - last < 5000) {
    return;
  }
  sessionStorage.setItem(key, String(now));
  window.location.reload();
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
