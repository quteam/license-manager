import { addDaysIso, addMonthsIso, addYearsIso, isExpired, nowIso, secondsUntil } from "./time";
import { requireEnv } from "./config";
import {
  ADMIN_ROLE,
  APP_STATUS,
  CODE_BULK_ACTION,
  CODE_STATUS,
  LOG_ACTION,
  LOG_RESULT,
  TENANT_STATUS,
  type AppStatus,
  type CodeBulkAction,
  type LogAction,
  type TenantStatus
} from "./constants";
import { codeSuffix, generateActivationCode, generateRandomToken, hashPassword, hmacSha256, normalizeCode, timingSafeEqual, verifyPassword } from "./crypto";
import { Repository } from "./repository";
import { ApiError, AppRow, Bindings, CodeDetailRow } from "./types";

export const MAX_REBINDS = 3;
export const REBIND_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const READ_ONLY_ADMIN_USERNAME = "test";

export class LicenseService {
  constructor(
    private readonly repo: Repository,
    private readonly env: Bindings
  ) {}

  async ensureBootstrapAdmin(): Promise<void> {
    const username = this.env.ADMIN_BOOTSTRAP_USERNAME;
    const password = this.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!username || !password) {
      return;
    }
    const existing = await this.repo.getAdminByUsername(username);
    if (existing) {
      return;
    }
    const passwordRecord = await hashPassword(password);
    await this.repo.createAdmin({
      username,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt,
      role: ADMIN_ROLE.SUPER_ADMIN,
      tenantId: 1
    });
  }

  async authenticateAdmin(tenant: string, username: string, password: string) {
    await this.ensureBootstrapAdmin();
    const admin = await this.repo.getAdminByTenantAndUsername(tenant, username);
    if (!admin) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid tenant, username or password");
    }
    const valid = await verifyPassword(password, admin.password_salt, admin.password_hash);
    if (!valid) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid tenant, username or password");
    }
    if (admin.role === ADMIN_ROLE.TENANT_ADMIN && admin.tenant_status !== TENANT_STATUS.ACTIVE) {
      throw new ApiError(403, "FORBIDDEN", "Tenant is disabled");
    }
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      tenant_id: admin.tenant_id,
      tenant_name: admin.tenant_name
    };
  }

  async createTenant(input: {
    name: string;
    slug: string;
    status: TenantStatus;
    adminUsername: string;
    adminPassword: string;
  }) {
    validateTenantSlug(input.slug);
    validateNewPassword(input.adminPassword, "Admin password");
    if (await this.repo.getAdminByUsername(input.adminUsername)) {
      throw new ApiError(409, "CONFLICT", "Admin username already exists");
    }
    let tenant;
    try {
      const passwordRecord = await hashPassword(input.adminPassword);
      tenant = await this.repo.createTenant({
        name: input.name,
        slug: input.slug,
        status: input.status,
        adminUsername: input.adminUsername,
        passwordHash: passwordRecord.hash,
        passwordSalt: passwordRecord.salt
      });
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        throw new ApiError(409, "CONFLICT", "Tenant slug or admin username already exists");
      }
      throw error;
    }
    return { tenant, admins: await this.repo.listTenantAdmins(tenant.id) };
  }

  async updateTenant(input: { tenantId: number; name: string; slug: string }) {
    validateTenantSlug(input.slug);
    try {
      const tenant = await this.repo.updateTenant({ id: input.tenantId, name: input.name, slug: input.slug });
      if (!tenant) {
        throw new ApiError(404, "NOT_FOUND", "Tenant not found");
      }
      return { tenant };
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        throw new ApiError(409, "CONFLICT", "Tenant slug already exists");
      }
      throw error;
    }
  }

  async updateTenantStatus(tenantId: number, status: TenantStatus) {
    if (!(await this.repo.updateTenantStatus(tenantId, status))) {
      throw new ApiError(404, "NOT_FOUND", "Tenant not found");
    }
    return { updated: true };
  }

  async deleteTenant(tenantId: number) {
    const tenant = await this.repo.getTenantById(tenantId);
    if (!tenant) {
      throw new ApiError(404, "NOT_FOUND", "Tenant not found");
    }
    if (!(await this.repo.deleteTenantIfEmpty(tenantId))) {
      throw new ApiError(409, "CONFLICT", "Tenant has applications or is protected and cannot be deleted");
    }
    return { deleted: true };
  }

  async resetTenantAdminPassword(input: { tenantId: number; username: string; newPassword: string }) {
    validateNewPassword(input.newPassword, "New password");
    const admin = await this.repo.getAdminByUsername(input.username);
    if (!admin || admin.role !== ADMIN_ROLE.TENANT_ADMIN || admin.tenant_id !== input.tenantId) {
      throw new ApiError(404, "NOT_FOUND", "Tenant administrator not found");
    }
    const passwordRecord = await hashPassword(input.newPassword);
    await this.repo.updateAdminPassword({
      adminId: admin.id,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    });
    return { updated: true };
  }

  async changeAdminPassword(input: { adminId: number; currentPassword: string; newPassword: string }) {
    if (input.newPassword.length < 8) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be at least 8 characters");
    }
    if (input.currentPassword === input.newPassword) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be different from current password");
    }
    const admin = await this.repo.getAdminCredentialsById(input.adminId);
    if (!admin) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    if (admin.username === READ_ONLY_ADMIN_USERNAME) {
      throw new ApiError(403, "FORBIDDEN", "Password changes are disabled for this account");
    }
    const valid = await verifyPassword(input.currentPassword, admin.password_salt, admin.password_hash);
    if (!valid) {
      throw new ApiError(401, "UNAUTHORIZED", "Current password is incorrect");
    }
    const passwordRecord = await hashPassword(input.newPassword);
    const updated = await this.repo.updateAdminPassword({
      adminId: input.adminId,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    });
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    return {
      updated: true
    };
  }

  async resetAdminPassword(input: { username: string; recoveryPassword: string; newPassword: string }) {
    const bootstrapUsername = this.env.ADMIN_BOOTSTRAP_USERNAME;
    const bootstrapPassword = this.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (!bootstrapUsername || !bootstrapPassword) {
      throw new ApiError(403, "FORBIDDEN", "Password reset is not configured");
    }
    if (input.newPassword.length < 8) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be at least 8 characters");
    }
    if (input.newPassword === input.recoveryPassword) {
      throw new ApiError(400, "BAD_REQUEST", "New password must be different from recovery password");
    }
    if (input.username !== bootstrapUsername || !timingSafeEqual(input.recoveryPassword, bootstrapPassword)) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid username or recovery password");
    }

    await this.ensureBootstrapAdmin();
    const admin = await this.repo.getAdminByUsername(input.username);
    if (!admin) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    const passwordRecord = await hashPassword(input.newPassword);
    const updated = await this.repo.updateAdminPassword({
      adminId: admin.id,
      passwordHash: passwordRecord.hash,
      passwordSalt: passwordRecord.salt
    });
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Admin not found");
    }
    return {
      reset: true
    };
  }

  async createApp(input: { tenantId: number; name: string; description?: string; purchaseUrl?: string; platform: string; status?: AppStatus }) {
    const appId = `app_${generateRandomToken(12)}`;
    const appSecret = `sec_${generateRandomToken(32)}`;
    const appSecretHash = await this.hashAppSecret(appSecret);
    const app = await this.repo.createApp({
      tenantId: input.tenantId,
      appId,
      name: input.name,
      description: input.description,
      purchaseUrl: input.purchaseUrl,
      platform: input.platform,
      status: input.status ?? APP_STATUS.ACTIVE,
      appSecretHash
    });
    return {
      app: stripAppSecret(app),
      app_secret: appSecret
    };
  }

  async updateApp(input: { tenantId: number; appId: string; name: string; description?: string; purchaseUrl?: string; platform: string }) {
    const app = await this.repo.updateApp(input);
    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    return {
      app: stripAppSecret(app)
    };
  }

  async updateAppStatus(input: { tenantId: number; appId: string; status: AppStatus; adminId: number }) {
    const app = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const updated = await this.repo.updateAppStatus(input.appId, input.tenantId, input.status);
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    await this.repo.insertLog({
      appDbId: app.id,
      action: input.status === APP_STATUS.DISABLED ? LOG_ACTION.DISABLE_APP : LOG_ACTION.ENABLE_APP,
      result: LOG_RESULT.SUCCESS,
      message: `${input.status === APP_STATUS.DISABLED ? "禁用" : "启用"}应用，管理员 ID：${input.adminId}`
    });
    return {
      updated: true
    };
  }

  async rotateAppSecret(input: { tenantId: number; appId: string; adminId: number }) {
    const app = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const appSecret = `sec_${generateRandomToken(32)}`;
    const appSecretHash = await this.hashAppSecret(appSecret);
    const updatedApp = await this.repo.updateAppSecretHash(input.appId, input.tenantId, appSecretHash);
    if (!updatedApp) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    await this.repo.insertLog({
      appDbId: app.id,
      action: LOG_ACTION.ROTATE_APP_SECRET,
      result: LOG_RESULT.SUCCESS,
      message: `更换应用密钥，管理员 ID：${input.adminId}`
    });
    return {
      app: stripAppSecret(updatedApp),
      app_secret: appSecret
    };
  }

  async deleteApp(appId: string, tenantId: number) {
    const app = await this.repo.getAppByPublicId(appId, tenantId);
    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const deleted = await this.repo.deleteAppIfUnreferenced(app.id);
    if (!deleted) {
      throw new ApiError(409, "CONFLICT", "App has activation data and cannot be deleted");
    }
    return {
      deleted: true
    };
  }

  async generateCodes(input: {
    tenantId: number;
    appId: string;
    planCode: string;
    quantity: number;
    note?: string;
    adminId: number;
  }) {
    const app = await this.repo.getAppByPublicId(input.appId, input.tenantId);
    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    const plan = await this.repo.getPlanByCode(input.planCode);
    if (!plan) {
      throw new ApiError(404, "NOT_FOUND", "Plan not found");
    }
    const batchId = await this.repo.createBatch({
      appDbId: app.id,
      planId: plan.id,
      quantity: input.quantity,
      note: input.note,
      createdBy: input.adminId
    });

    const codes: string[] = [];
    const pending: Parameters<Repository["createActivationCodes"]>[0] = [];
    const generatedHashes = new Set<string>();
    let attempts = 0;
    while (codes.length < input.quantity) {
      attempts += 1;
      if (attempts > input.quantity * 4 + 20) {
        throw new ApiError(409, "CONFLICT", "Unable to generate unique activation codes");
      }
      const code = generateActivationCode();
      const normalized = normalizeCode(code);
      const codeHash = await this.hashCode(normalized);
      if (generatedHashes.has(codeHash)) {
        continue;
      }
      generatedHashes.add(codeHash);
      pending.push({
        batchId,
        appDbId: app.id,
        planId: plan.id,
        codeHash,
        codeSuffix: codeSuffix(normalized),
        createdBy: input.adminId
      });
      codes.push(code);
    }

    try {
      await this.repo.createActivationCodes(pending);
    } catch (error) {
      if (String(error).includes("UNIQUE")) {
        throw new ApiError(409, "CONFLICT", "Generated activation code collision, please retry");
      }
      throw error;
    }

    await this.repo.insertLog({
      appDbId: app.id,
      action: LOG_ACTION.BATCH_GENERATE,
      result: LOG_RESULT.SUCCESS,
      message: `批量生成 ${codes.length} 个${plan.name}激活码`
    });

    return {
      batch_id: batchId,
      app_id: app.app_id,
      plan_code: plan.code,
      quantity: codes.length,
      codes
    };
  }

  async activate(input: { appId: string; appSecret: string; code: string; deviceFingerprint: string }) {
    const app = await this.requireValidClientApp(input.appId, input.appSecret);
    const deviceHash = await this.hashDevice(input.deviceFingerprint);
    const codeHash = await this.hashCode(normalizeCode(input.code));
    const code = await this.requireCode(codeHash, app);

    try {
      this.assertCodeUsable(code, deviceHash);
      if (code.status === CODE_STATUS.ACTIVE) {
        if (!code.device_hash) {
          if (code.rebind_count > MAX_REBINDS) {
            throw new ApiError(403, "REBINDS_EXCEEDED", "Device unbind limit exceeded");
          }
          const reboundAt = nowIso();
          const rebound = await this.repo.bindUnboundDevice({
            codeId: code.id,
            deviceHash,
            boundAt: reboundAt
          });
          if (!rebound) {
            throw new ApiError(409, "CONFLICT", "Activation code was bound by another request");
          }
          const reboundCode = await this.requireCode(codeHash, app);
          await this.repo.insertLog({
            codeId: code.id,
            appDbId: app.id,
            action: LOG_ACTION.ACTIVATE,
            result: LOG_RESULT.SUCCESS,
            deviceHash,
            message: "重新绑定成功"
          });
          return this.toClientLicense(reboundCode);
        }
        await this.repo.insertLog({
          codeId: code.id,
          appDbId: app.id,
          action: LOG_ACTION.ACTIVATE,
          result: LOG_RESULT.SUCCESS,
          deviceHash,
          message: "该设备已激活"
        });
        return this.toClientLicense(code);
      }

      const activatedAt = nowIso();
      const expiresAt = this.calculateExpiresAt(activatedAt, code);
      const activated = await this.repo.activateCode({
        codeId: code.id,
        deviceHash,
        activatedAt,
        expiresAt
      });
      if (!activated) {
        throw new ApiError(409, "CONFLICT", "Activation code was activated by another request");
      }
      const activatedCode = await this.requireCode(codeHash, app);
      await this.repo.insertLog({
        codeId: code.id,
        appDbId: app.id,
        action: LOG_ACTION.ACTIVATE,
        result: LOG_RESULT.SUCCESS,
        deviceHash,
        message: "激活成功"
      });
      return this.toClientLicense(activatedCode);
    } catch (error) {
      await this.logClientFailure(error, code, app, LOG_ACTION.ACTIVATE, deviceHash);
      throw error;
    }
  }

  async getClientAppInfo(input: { appId: string; appSecret: string }) {
    const app = await this.requireValidClientApp(input.appId, input.appSecret);
    return toClientAppInfo(app);
  }

  async verify(input: { appId: string; appSecret: string; code: string; deviceFingerprint: string }) {
    const app = await this.requireValidClientApp(input.appId, input.appSecret);
    const deviceHash = await this.hashDevice(input.deviceFingerprint);
    const codeHash = await this.hashCode(normalizeCode(input.code));
    const code = await this.requireCode(codeHash, app);
    try {
      this.assertCodeUsable(code, deviceHash);
      if (code.status !== CODE_STATUS.ACTIVE) {
        throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
      }
      if (!code.device_hash) {
        throw new ApiError(403, "DEVICE_MISMATCH", "Activation code is not bound to a device");
      }
      await this.repo.insertLog({
        codeId: code.id,
        appDbId: app.id,
        action: LOG_ACTION.VERIFY,
        result: LOG_RESULT.SUCCESS,
        deviceHash,
        message: "校验成功"
      });
      return this.toClientLicense(code);
    } catch (error) {
      await this.logClientFailure(error, code, app, LOG_ACTION.VERIFY, deviceHash);
      throw error;
    }
  }

  async unbindDevice(input: {
    appId: string;
    appSecret: string;
    code: string;
    deviceFingerprint: string;
  }) {
    const app = await this.requireValidClientApp(input.appId, input.appSecret);
    const deviceHash = await this.hashDevice(input.deviceFingerprint);
    const codeHash = await this.hashCode(normalizeCode(input.code));
    const code = await this.requireCode(codeHash, app);
    try {
      this.assertActiveForUnbind(code, deviceHash);
      if (code.status !== CODE_STATUS.ACTIVE) {
        throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
      }
      if (code.rebind_count >= MAX_REBINDS) {
        throw new ApiError(403, "REBINDS_EXCEEDED", "Device unbind limit exceeded");
      }
      if (code.last_rebind_at && Date.now() - new Date(code.last_rebind_at).getTime() < REBIND_COOLDOWN_MS) {
        throw new ApiError(429, "REBINDS_TOO_FREQUENT", "Device unbind is cooling down");
      }
      const unboundAt = nowIso();
      const unbound = await this.repo.unbindDevice({
        codeId: code.id,
        deviceHash,
        unboundAt,
        maxRebinds: MAX_REBINDS
      });
      if (!unbound) {
        throw new ApiError(409, "CONFLICT", "Device unbind conflict");
      }
      const unboundCode = await this.requireCode(codeHash, app);
      await this.repo.insertLog({
        codeId: code.id,
        appDbId: app.id,
        action: LOG_ACTION.UNBIND_DEVICE,
        result: LOG_RESULT.SUCCESS,
        deviceHash,
        message: "解绑成功"
      });
      return this.toClientLicense(unboundCode);
    } catch (error) {
      await this.logClientFailure(error, code, app, LOG_ACTION.UNBIND_DEVICE, deviceHash);
      throw error;
    }
  }

  async deleteCode(codeId: number, adminId: number, tenantId: number) {
    const deleted = await this.repo.softDeleteCode(codeId, tenantId);
    if (!deleted) {
      throw new ApiError(404, "NOT_FOUND", "Activation code not found");
    }
    await this.repo.insertLog({
      codeId,
      action: LOG_ACTION.DELETE_CODE,
      result: LOG_RESULT.SUCCESS,
      message: `删除激活码，管理员 ID：${adminId}`
    });
  }

  async updateCodeDisabled(input: { codeId: number; tenantId: number; disabled: boolean; adminId: number }) {
    const changedAt = nowIso();
    const updated = await this.repo.updateCodeDisabled({
      codeId: input.codeId,
      tenantId: input.tenantId,
      disabled: input.disabled,
      changedAt
    });
    if (!updated) {
      throw new ApiError(404, "NOT_FOUND", "Activation code not found");
    }
    await this.repo.insertLog({
      codeId: input.codeId,
      action: input.disabled ? LOG_ACTION.DISABLE_CODE : LOG_ACTION.ENABLE_CODE,
      result: LOG_RESULT.SUCCESS,
      message: `${input.disabled ? "禁用" : "启用"}激活码，管理员 ID：${input.adminId}`
    });
    return {
      updated: true
    };
  }

  async manuallyUnbindDevice(input: { codeId: number; tenantId: number; adminId: number }) {
    const unbound = await this.repo.manuallyUnbindDevice({
      codeId: input.codeId,
      tenantId: input.tenantId,
      changedAt: nowIso()
    });
    if (!unbound) {
      throw new ApiError(404, "NOT_FOUND", "Bound activation code not found");
    }
    await this.repo.insertLog({
      codeId: input.codeId,
      action: LOG_ACTION.MANUAL_UNBIND_DEVICE,
      result: LOG_RESULT.SUCCESS,
      message: `手动解绑设备，管理员 ID：${input.adminId}`
    });
    return {
      unbound: true
    };
  }

  async bulkUpdateCodes(input: { codeIds: number[]; tenantId: number; action: CodeBulkAction; adminId: number }) {
    let updated = 0;
    for (const codeId of input.codeIds) {
      const changed = await this.updateCodeByBulkAction(codeId, input.action, input.tenantId);
      if (!changed) {
        continue;
      }
      updated += 1;
      await this.repo.insertLog({
        codeId,
        action: toCodeLogAction(input.action),
        result: LOG_RESULT.SUCCESS,
        message: `${toCodeLogVerb(input.action)}激活码，管理员 ID：${input.adminId}`
      });
    }
    if (updated === 0) {
      throw new ApiError(404, "NOT_FOUND", "No activation codes were updated");
    }
    return {
      action: input.action,
      requested: input.codeIds.length,
      updated
    };
  }

  private async requireValidClientApp(appId: string, appSecret: string): Promise<AppRow> {
    const app = await this.repo.getAppByPublicId(appId);
    if (!app) {
      throw new ApiError(404, "NOT_FOUND", "App not found");
    }
    if (app.status !== APP_STATUS.ACTIVE) {
      throw new ApiError(403, "APP_DISABLED", "App is disabled");
    }
    if (app.tenant_status !== TENANT_STATUS.ACTIVE) {
      throw new ApiError(403, "APP_DISABLED", "Tenant is disabled");
    }
    const secretHash = await this.hashAppSecret(appSecret);
    if (!timingSafeEqual(secretHash, app.app_secret_hash)) {
      throw new ApiError(401, "INVALID_APP_SECRET", "Invalid app secret");
    }
    return app;
  }

  private async updateCodeByBulkAction(codeId: number, action: CodeBulkAction, tenantId: number): Promise<boolean> {
    if (action === CODE_BULK_ACTION.DELETE) {
      return await this.repo.softDeleteCode(codeId, tenantId);
    }
    return await this.repo.updateCodeDisabled({
      codeId,
      tenantId,
      disabled: action === CODE_BULK_ACTION.DISABLE,
      changedAt: nowIso()
    });
  }

  private async requireCode(codeHash: string, app: AppRow): Promise<CodeDetailRow> {
    const code = await this.repo.findCodeByHash(codeHash);
    if (!code || code.app_id !== app.id) {
      throw new ApiError(404, "INVALID_CODE", "Activation code not found");
    }
    return code;
  }

  private assertCodeUsable(code: CodeDetailRow, deviceHash: string): void {
    if (code.status === CODE_STATUS.DELETED) {
      throw new ApiError(410, "CODE_DELETED", "Activation code was deleted");
    }
    if (code.disabled_at) {
      throw new ApiError(403, "CODE_DISABLED", "Activation code is disabled");
    }
    if (isExpired(code.expires_at)) {
      throw new ApiError(403, "CODE_EXPIRED", "Activation code has expired");
    }
    if (code.status === CODE_STATUS.ACTIVE && code.device_hash && !timingSafeEqual(code.device_hash, deviceHash)) {
      throw new ApiError(403, "DEVICE_MISMATCH", "Activation code is bound to another device");
    }
  }

  private assertActiveForUnbind(code: CodeDetailRow, deviceHash: string): void {
    if (code.status === CODE_STATUS.DELETED) {
      throw new ApiError(410, "CODE_DELETED", "Activation code was deleted");
    }
    if (code.disabled_at) {
      throw new ApiError(403, "CODE_DISABLED", "Activation code is disabled");
    }
    if (isExpired(code.expires_at)) {
      throw new ApiError(403, "CODE_EXPIRED", "Activation code has expired");
    }
    if (code.status !== CODE_STATUS.ACTIVE || !code.device_hash) {
      throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
    }
    if (!timingSafeEqual(code.device_hash, deviceHash)) {
      throw new ApiError(403, "DEVICE_MISMATCH", "Device fingerprint does not match");
    }
  }

  private toClientLicense(code: CodeDetailRow) {
    if (!code.expires_at || !code.activated_at) {
      throw new ApiError(400, "INVALID_CODE", "Activation code has not been activated");
    }
    return {
      valid: true,
      device_bound: Boolean(code.device_hash),
      app_id: code.app_public_id,
      plan: {
        code: code.plan_code,
        name: code.plan_name,
        duration_days: code.duration_days
      },
      activated_at: code.activated_at,
      expires_at: code.expires_at,
      remaining_seconds: secondsUntil(code.expires_at),
      rebind_count: code.rebind_count,
      max_rebinds: MAX_REBINDS
    };
  }

  private calculateExpiresAt(activatedAt: string, code: CodeDetailRow): string {
    switch (code.plan_code) {
      case "monthly":
        return addMonthsIso(activatedAt, 1);
      case "quarterly":
        return addMonthsIso(activatedAt, 3);
      case "yearly":
        return addYearsIso(activatedAt, 1);
      default:
        return addDaysIso(activatedAt, code.duration_days);
    }
  }

  private async logClientFailure(
    error: unknown,
    code: CodeDetailRow,
    app: AppRow,
    action: LogAction,
    deviceHash: string
  ): Promise<void> {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "CONFLICT", "Unexpected failure");
    await this.repo.insertLog({
      codeId: code.id,
      appDbId: app.id,
      action,
      result: LOG_RESULT.FAILURE,
      deviceHash,
      errorCode: apiError.code,
      message: toLogErrorMessage(apiError)
    });
  }

  private async hashCode(code: string): Promise<string> {
    return await hmacSha256(requireEnv(this.env, "CODE_HMAC_SECRET"), code);
  }

  private async hashAppSecret(secret: string): Promise<string> {
    return await hmacSha256(requireEnv(this.env, "APP_SECRET_HMAC_SECRET"), secret);
  }

  private async hashDevice(deviceFingerprint: string): Promise<string> {
    return await hmacSha256(requireEnv(this.env, "DEVICE_HMAC_SECRET"), deviceFingerprint);
  }
}

function stripAppSecret(app: AppRow) {
  const { app_secret_hash: _appSecretHash, tenant_status: _tenantStatus, ...safeApp } = app;
  return safeApp;
}

function validateTenantSlug(slug: string): void {
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
    throw new ApiError(400, "BAD_REQUEST", "Tenant slug must use 2-63 lowercase letters, numbers or hyphens");
  }
}

function validateNewPassword(password: string, label: string): void {
  if (password.length < 8) {
    throw new ApiError(400, "BAD_REQUEST", `${label} must be at least 8 characters`);
  }
}

function toClientAppInfo(app: AppRow) {
  return {
    app_id: app.app_id,
    name: app.name,
    description: app.description,
    purchase_url: app.purchase_url,
    platform: app.platform,
    status: app.status
  };
}

function toLogErrorMessage(error: ApiError): string {
  const messages: Record<string, string> = {
    APP_DISABLED: "应用已禁用",
    INVALID_APP_SECRET: "应用密钥无效",
    INVALID_CODE: "激活码无效",
    CODE_DISABLED: "激活码已禁用",
    CODE_DELETED: "激活码已删除",
    CODE_EXPIRED: "激活码已过期",
    DEVICE_MISMATCH: "设备不匹配",
    REBINDS_EXCEEDED: "解绑次数已达上限",
    REBINDS_TOO_FREQUENT: "解绑冷却中",
    CONFLICT: "操作冲突"
  };
  return messages[error.code] ?? "操作失败";
}

function toCodeLogAction(action: CodeBulkAction): LogAction {
  if (action === CODE_BULK_ACTION.DELETE) {
    return LOG_ACTION.DELETE_CODE;
  }
  return action === CODE_BULK_ACTION.DISABLE ? LOG_ACTION.DISABLE_CODE : LOG_ACTION.ENABLE_CODE;
}

function toCodeLogVerb(action: CodeBulkAction): string {
  if (action === CODE_BULK_ACTION.DELETE) {
    return "删除";
  }
  return action === CODE_BULK_ACTION.DISABLE ? "禁用" : "启用";
}
