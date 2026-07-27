import { Context, Next } from "hono";
import { ADMIN_ROLE, TENANT_STATUS } from "./constants";
import { requireEnv } from "./config";
import { verifyJwt } from "./crypto";
import { fail } from "./http";
import { Repository } from "./repository";
import { ApiError, Bindings, Variables } from "./types";

export async function requireAdmin(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    return c.json(fail("UNAUTHORIZED", "Missing bearer token"), 401);
  }
  const payload = await verifyJwt(requireEnv(c.env, "JWT_SECRET"), token);
  if (!payload) {
    return c.json(fail("UNAUTHORIZED", "Invalid or expired token"), 401);
  }
  const repo = new Repository(c.env.DB);
  const admin = await repo.getAdminById(Number(payload.sub));
  if (!admin) {
    return c.json(fail("UNAUTHORIZED", "Admin no longer exists"), 401);
  }
  if (admin.role === ADMIN_ROLE.TENANT_ADMIN && admin.tenant_status !== TENANT_STATUS.ACTIVE) {
    return c.json(fail("FORBIDDEN", "Tenant is disabled"), 403);
  }
  c.set("admin", {
    id: admin.id,
    username: admin.username,
    role: admin.role,
    tenant_id: admin.tenant_id,
    tenant_name: admin.tenant_name
  });
  await next();
}

export function requireSuperAdmin(c: Context<{ Bindings: Bindings; Variables: Variables }>): void {
  if (c.get("admin").role !== ADMIN_ROLE.SUPER_ADMIN) {
    throw new ApiError(403, "FORBIDDEN", "Super administrator access required");
  }
}

export async function resolveTenantId(c: Context<{ Bindings: Bindings; Variables: Variables }>): Promise<number> {
  const admin = c.get("admin");
  if (admin.role === ADMIN_ROLE.TENANT_ADMIN) {
    if (!admin.tenant_id) {
      throw new ApiError(403, "FORBIDDEN", "Administrator has no tenant");
    }
    return admin.tenant_id;
  }
  const rawTenantId = c.req.header("X-Tenant-Id");
  const tenantId = rawTenantId ? Number(rawTenantId) : NaN;
  if (!Number.isInteger(tenantId) || tenantId < 1) {
    throw new ApiError(400, "BAD_REQUEST", "X-Tenant-Id header is required");
  }
  const tenant = await new Repository(c.env.DB).getTenantById(tenantId);
  if (!tenant) {
    throw new ApiError(404, "NOT_FOUND", "Tenant not found");
  }
  if (tenant.status !== TENANT_STATUS.ACTIVE) {
    throw new ApiError(403, "FORBIDDEN", "Tenant is disabled");
  }
  return tenant.id;
}
