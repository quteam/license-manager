import { Hono } from "hono";
import { requireEnv, validateEnv } from "./config";
import {
  APP_STATUS,
  CODE_BULK_ACTION,
  CODE_TOGGLE_STATUS,
  MAX_CODE_BATCH_QUANTITY,
  isAppStatus,
  isCodeBulkAction,
  isCodeListStatus,
  isCodeToggleStatus
} from "./constants";
import { signJwt } from "./crypto";
import { ok, optionalHttpUrl, optionalString, readJson, requireInteger, requireString } from "./http";
import { requireAdmin } from "./middleware";
import { Repository } from "./repository";
import { LicenseService } from "./service";
import { ApiError, Bindings, Variables } from "./types";

export function createApi() {
  const api = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  api.use("*", async (c, next) => {
    validateEnv(c.env);
    await next();
  });

  api.get("/health", (c) => c.json(ok({ status: "ok" })));

  api.post("/admin/login", async (c) => {
    const body = await readJson(c.req.raw);
    const username = requireString(body.username, "username");
    const password = requireString(body.password, "password");
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const admin = await service.authenticateAdmin(username, password);
    const token = await signJwt(requireEnv(c.env, "JWT_SECRET"), { sub: String(admin.id), username: admin.username }, 8 * 60 * 60);
    return c.json(ok({ token, admin }));
  });

  api.post("/recovery/admin-password", async (c) => {
    const body = await readJson(c.req.raw);
    const username = requireString(body.username, "username");
    const recoveryPassword = requireString(body.recovery_password, "recovery_password");
    const newPassword = requireString(body.new_password, "new_password");
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.resetAdminPassword({
      username,
      recoveryPassword,
      newPassword
    });
    return c.json(ok(result));
  });

  api.use("/admin/*", requireAdmin);

  api.get("/admin/me", (c) => c.json(ok({ admin: c.get("admin") })));

  api.get("/admin/dashboard", async (c) => {
    const repo = new Repository(c.env.DB);
    return c.json(ok(await repo.getDashboardStats()));
  });

  api.patch("/admin/password", async (c) => {
    const body = await readJson(c.req.raw);
    const currentPassword = requireString(body.current_password, "current_password");
    const newPassword = requireString(body.new_password, "new_password");
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.changeAdminPassword({
      adminId: c.get("admin").id,
      currentPassword,
      newPassword
    });
    return c.json(ok(result));
  });

  api.get("/admin/plans", async (c) => {
    const repo = new Repository(c.env.DB);
    return c.json(ok({ items: await repo.getPlans() }));
  });

  api.get("/admin/apps", async (c) => {
    const repo = new Repository(c.env.DB);
    return c.json(ok({ items: await repo.listApps() }));
  });

  api.post("/admin/apps", async (c) => {
    const body = await readJson(c.req.raw);
    const name = requireString(body.name, "name");
    const description = optionalString(body.description);
    const purchaseUrl = optionalHttpUrl(body.purchase_url, "purchase_url");
    const platform = requireString(body.platform, "platform");
    const status = optionalString(body.status) === APP_STATUS.DISABLED ? APP_STATUS.DISABLED : APP_STATUS.ACTIVE;
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const app = await service.createApp({ name, description, purchaseUrl, platform, status });
    return c.json(ok(app), 201);
  });

  api.patch("/admin/apps/:appId", async (c) => {
    const body = await readJson(c.req.raw);
    const name = requireString(body.name, "name");
    const description = optionalString(body.description);
    const purchaseUrl = optionalHttpUrl(body.purchase_url, "purchase_url");
    const platform = requireString(body.platform, "platform");
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const app = await service.updateApp({ appId: c.req.param("appId"), name, description, purchaseUrl, platform });
    return c.json(ok(app));
  });

  api.patch("/admin/apps/:appId/status", async (c) => {
    const body = await readJson(c.req.raw);
    const status = requireString(body.status, "status");
    if (!isAppStatus(status)) {
      throw new ApiError(400, "BAD_REQUEST", "status must be active or disabled");
    }
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.updateAppStatus({
      appId: c.req.param("appId"),
      status,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });

  api.patch("/admin/apps/:appId/secret", async (c) => {
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.rotateAppSecret({
      appId: c.req.param("appId"),
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });

  api.delete("/admin/apps/:appId", async (c) => {
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.deleteApp(c.req.param("appId"));
    return c.json(ok(result));
  });

  api.post("/admin/codes/batch", async (c) => {
    const body = await readJson(c.req.raw);
    const appId = requireString(body.app_id, "app_id");
    const planCode = requireString(body.plan_code, "plan_code");
    const quantity = requireInteger(body.quantity, "quantity", { min: 1, max: MAX_CODE_BATCH_QUANTITY });
    const note = optionalString(body.note);
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.generateCodes({
      appId,
      planCode,
      quantity,
      note,
      adminId: c.get("admin").id
    });
    return c.json(ok(result), 201);
  });

  api.get("/admin/codes", async (c) => {
    const repo = new Repository(c.env.DB);
    const page = requireInteger(c.req.query("page") ?? 1, "page", { min: 1 });
    const pageSize = requireInteger(c.req.query("page_size") ?? 20, "page_size", { min: 1, max: 100 });
    const status = c.req.query("status");
    const normalizedStatus = status && isCodeListStatus(status) ? status : undefined;
    if (status && !normalizedStatus) {
      throw new ApiError(400, "BAD_REQUEST", "Invalid status filter");
    }
    const result = await repo.listCodes({
      query: c.req.query("query") || undefined,
      appId: c.req.query("app_id") || undefined,
      planCode: c.req.query("plan_code") || undefined,
      status: normalizedStatus,
      page,
      pageSize
    });
    return c.json(ok(result));
  });

  api.patch("/admin/codes/:id/status", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const body = await readJson(c.req.raw);
    const status = requireString(body.status, "status");
    if (!isCodeToggleStatus(status)) {
      throw new ApiError(400, "BAD_REQUEST", "status must be enabled or disabled");
    }
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.updateCodeDisabled({
      codeId: id,
      disabled: status === CODE_TOGGLE_STATUS.DISABLED,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });

  api.patch("/admin/codes/:id/unbind-device", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.manuallyUnbindDevice({
      codeId: id,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });

  api.post("/admin/codes/bulk", async (c) => {
    const body = await readJson(c.req.raw);
    const action = requireString(body.action, "action");
    if (!isCodeBulkAction(action)) {
      throw new ApiError(400, "BAD_REQUEST", "action must be delete, enable or disable");
    }
    const ids = requireIntegerArray(body.ids, "ids", { min: 1, max: 100 });
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.bulkUpdateCodes({
      codeIds: ids,
      action,
      adminId: c.get("admin").id
    });
    return c.json(ok(result));
  });

  api.delete("/admin/codes/:id", async (c) => {
    const id = requireInteger(c.req.param("id"), "id", { min: 1 });
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    await service.deleteCode(id, c.get("admin").id);
    return c.json(ok({ deleted: true }));
  });

  api.get("/admin/logs", async (c) => {
    const repo = new Repository(c.env.DB);
    const page = requireInteger(c.req.query("page") ?? 1, "page", { min: 1 });
    const pageSize = requireInteger(c.req.query("page_size") ?? 20, "page_size", { min: 1, max: 100 });
    const result = await repo.listLogs({
      query: c.req.query("query") || undefined,
      appId: c.req.query("app_id") || undefined,
      action: c.req.query("action") || undefined,
      page,
      pageSize
    });
    return c.json(ok(result));
  });

  api.post("/client/activate", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.activate({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      code: requireString(body.code, "code"),
      deviceFingerprint: requireString(body.device_fingerprint, "device_fingerprint")
    });
    return c.json(ok(result));
  });

  api.post("/client/verify", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.verify({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      code: requireString(body.code, "code"),
      deviceFingerprint: requireString(body.device_fingerprint, "device_fingerprint")
    });
    return c.json(ok(result));
  });

  api.post("/client/unbind-device", async (c) => {
    const body = await readJson(c.req.raw);
    const repo = new Repository(c.env.DB);
    const service = new LicenseService(repo, c.env);
    const result = await service.unbindDevice({
      appId: requireString(body.app_id, "app_id"),
      appSecret: requireString(body.app_secret, "app_secret"),
      code: requireString(body.code, "code"),
      deviceFingerprint: requireString(body.device_fingerprint, "device_fingerprint")
    });
    return c.json(ok(result));
  });

  return api;
}

function requireIntegerArray(
  value: unknown,
  name: string,
  options: { min?: number; max?: number } = {}
): number[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must be an array`);
  }
  if (options.min !== undefined && value.length < options.min) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must contain at least ${options.min} item`);
  }
  if (options.max !== undefined && value.length > options.max) {
    throw new ApiError(400, "BAD_REQUEST", `${name} must contain at most ${options.max} items`);
  }
  const ids = value.map((item, index) => requireInteger(item, `${name}[${index}]`, { min: 1 }));
  return Array.from(new Set(ids));
}
