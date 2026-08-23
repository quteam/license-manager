import { beforeEach, describe, expect, it } from "vitest";
import { APP_STATUS, CODE_STATUS, LOG_ACTION, LOG_RESULT, type LogAction, type LogResult } from "../src/constants";
import { hashPassword, hmacSha256, normalizeCode } from "../src/crypto";
import { Repository } from "../src/repository";
import { LicenseService } from "../src/service";
import { ApiError, type AppRow, type Bindings, type CodeDetailRow, type ErrorCode, type VersionRow } from "../src/types";

const env = {
  CODE_HMAC_SECRET: "code-secret",
  APP_SECRET_HMAC_SECRET: "app-secret-secret",
  DEVICE_HMAC_SECRET: "device-secret",
  JWT_SECRET: "jwt-secret",
  ADMIN_BOOTSTRAP_USERNAME: "admin",
  ADMIN_BOOTSTRAP_PASSWORD: "recovery-secret"
} as Bindings;

describe("LicenseService device unbind flow", () => {
  let repo: MemoryRepo;
  let service: LicenseService;

  beforeEach(async () => {
    repo = await MemoryRepo.create();
    service = new LicenseService(repo as unknown as Repository, env);
  });

  it("unbinds the current device and rebinds on activate without resetting the license period", async () => {
    const beforeActivatedAt = repo.code.activated_at;
    const beforeExpiresAt = repo.code.expires_at;

    const unbound = await service.unbindDevice({
      appId: repo.app.app_id,
      appSecret: MemoryRepo.appSecret,
      code: MemoryRepo.code,
      deviceFingerprint: "device-a"
    });

    expect(unbound.rebind_count).toBe(1);
    expect(unbound.device_bound).toBe(false);
    expect(repo.code.device_hash).toBeNull();
    expect(repo.code.activated_at).toBe(beforeActivatedAt);
    expect(repo.code.expires_at).toBe(beforeExpiresAt);
    expect(repo.logs.at(-1)).toMatchObject({
      action: LOG_ACTION.UNBIND_DEVICE,
      result: LOG_RESULT.SUCCESS,
      message: "解绑成功"
    });

    await expect(
      service.verify({
        appId: repo.app.app_id,
        appSecret: MemoryRepo.appSecret,
        code: MemoryRepo.code,
        deviceFingerprint: "device-b"
      })
    ).rejects.toMatchObject({ code: "DEVICE_MISMATCH" });

    const rebound = await service.activate({
      appId: repo.app.app_id,
      appSecret: MemoryRepo.appSecret,
      code: MemoryRepo.code,
      deviceFingerprint: "device-b"
    });

    expect(rebound.rebind_count).toBe(1);
    expect(rebound.device_bound).toBe(true);
    expect(rebound.activated_at).toBe(beforeActivatedAt);
    expect(rebound.expires_at).toBe(beforeExpiresAt);
    expect(repo.code.device_hash).toBe(await hmacSha256(env.DEVICE_HMAC_SECRET, "device-b"));
    expect(repo.logs.at(-1)).toMatchObject({
      action: LOG_ACTION.ACTIVATE,
      result: LOG_RESULT.SUCCESS,
      message: "重新绑定成功"
    });
  });

  it("manually unbinds a code without consuming the self-service rebind count", async () => {
    const result = await service.manuallyUnbindDevice({
      codeId: repo.code.id,
      tenantId: 1,
      adminId: 99
    });

    expect(result).toEqual({ unbound: true });
    expect(repo.code.device_hash).toBeNull();
    expect(repo.code.rebind_count).toBe(0);
    expect(repo.code.last_rebind_at).toBeNull();
    expect(repo.logs.at(-1)).toMatchObject({
      action: LOG_ACTION.MANUAL_UNBIND_DEVICE,
      result: LOG_RESULT.SUCCESS,
      message: "手动解绑设备，管理员 ID：99"
    });
  });
});

describe("LicenseService client app info", () => {
  let repo: MemoryRepo;
  let service: LicenseService;

  beforeEach(async () => {
    repo = await MemoryRepo.create();
    service = new LicenseService(repo as unknown as Repository, env);
  });

  it("returns public app information after validating the app secret", async () => {
    await expect(
      service.getClientAppInfo({
        appId: repo.app.app_id,
        appSecret: MemoryRepo.appSecret
      })
    ).resolves.toEqual({
      app_id: repo.app.app_id,
      name: repo.app.name,
      description: repo.app.description,
      purchase_url: repo.app.purchase_url,
      platform: repo.app.platform,
      status: repo.app.status,
      latest_version: null
    });
  });

  it("rejects an invalid app secret", async () => {
    await expect(
      service.getClientAppInfo({
        appId: repo.app.app_id,
        appSecret: "wrong-secret"
      })
    ).rejects.toMatchObject({ code: "INVALID_APP_SECRET" });
  });

  it("rejects client access when the owning tenant is disabled", async () => {
    repo.app.tenant_status = "disabled";
    await expect(
      service.getClientAppInfo({
        appId: repo.app.app_id,
        appSecret: MemoryRepo.appSecret
      })
    ).rejects.toMatchObject({ code: "APP_DISABLED" });
  });
});

describe("LicenseService admin password reset", () => {
  let repo: MemoryRepo;
  let service: LicenseService;

  beforeEach(async () => {
    repo = await MemoryRepo.create();
    service = new LicenseService(repo as unknown as Repository, env);
  });

  it("resets the bootstrap admin password when the recovery password is valid", async () => {
    const result = await service.resetAdminPassword({
      username: "admin",
      recoveryPassword: "recovery-secret",
      newPassword: "new-admin-password"
    });

    expect(result).toEqual({ reset: true });
    await expect(service.authenticateAdmin("default", "admin", "old-admin-password")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.authenticateAdmin("默认租户", "admin", "new-admin-password")).resolves.toEqual({
      id: repo.admin.id,
      username: "admin",
      role: "super_admin",
      tenant_id: 1,
      tenant_name: "默认租户"
    });
  });

  it("rejects invalid recovery password without changing the admin password", async () => {
    await expect(
      service.resetAdminPassword({
        username: "admin",
        recoveryPassword: "wrong-secret",
        newPassword: "new-admin-password"
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(service.authenticateAdmin("default", "admin", "old-admin-password")).resolves.toEqual({
      id: repo.admin.id,
      username: "admin",
      role: "super_admin",
      tenant_id: 1,
      tenant_name: "默认租户"
    });
  });

  it("rejects valid credentials for a different tenant", async () => {
    await expect(service.authenticateAdmin("other-tenant", "admin", "old-admin-password")).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("rejects a tenant administrator when the tenant is disabled", async () => {
    repo.admin.role = "tenant_admin";
    repo.admin.tenant_id = 1;
    repo.admin.tenant_name = "Disabled tenant";
    repo.admin.tenant_status = "disabled";

    await expect(service.authenticateAdmin("Disabled tenant", "admin", "old-admin-password")).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("refuses password changes for the read-only test administrator", async () => {
    repo.admin.username = "test";
    const previousHash = repo.admin.password_hash;
    const previousSalt = repo.admin.password_salt;

    await expect(
      service.changeAdminPassword({
        adminId: repo.admin.id,
        currentPassword: "old-admin-password",
        newPassword: "new-admin-password"
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(repo.admin.password_hash).toBe(previousHash);
    expect(repo.admin.password_salt).toBe(previousSalt);
  });
});

type LogInput = {
  codeId?: number;
  appDbId?: number;
  action: LogAction;
  result: LogResult;
  deviceHash?: string;
  errorCode?: ErrorCode;
  message?: string;
};

class MemoryRepo {
  static readonly appSecret = "sec_test";
  static readonly code = "LM-ABCDE-23456-FGHIJ-789KL";

  readonly logs: LogInput[] = [];
  readonly app: AppRow;
  readonly code: CodeDetailRow;
  readonly admin: {
    id: number;
    tenant_id: number | null;
    tenant_name: string | null;
    tenant_status: "active" | "disabled" | null;
    role: "super_admin" | "tenant_admin";
    username: string;
    password_hash: string;
    password_salt: string;
    created_at: string;
    updated_at: string;
  };

  private constructor(
    app: AppRow,
    code: CodeDetailRow,
    admin: {
      id: number;
      tenant_id: number | null;
      tenant_name: string | null;
      tenant_status: "active" | "disabled" | null;
      role: "super_admin" | "tenant_admin";
      username: string;
      password_hash: string;
      password_salt: string;
      created_at: string;
      updated_at: string;
    }
  ) {
    this.app = app;
    this.code = code;
    this.admin = admin;
  }

  static async create() {
    const app: AppRow = {
      id: 1,
      tenant_id: 1,
      tenant_status: "active",
      app_id: "app_test",
      name: "Test App",
      description: null,
      purchase_url: null,
      platform: "desktop",
      status: APP_STATUS.ACTIVE,
      app_secret_hash: await hmacSha256(env.APP_SECRET_HMAC_SECRET, MemoryRepo.appSecret),
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z"
    };
    const code: CodeDetailRow = {
      id: 10,
      batch_id: null,
      app_id: app.id,
      plan_id: 1,
      code_hash: await hmacSha256(env.CODE_HMAC_SECRET, normalizeCode(MemoryRepo.code)),
      code_suffix: "J789KL",
      status: CODE_STATUS.ACTIVE,
      disabled_at: null,
      activated_at: "2026-06-25T08:00:00.000Z",
      expires_at: "2099-07-25T08:00:00.000Z",
      device_hash: await hmacSha256(env.DEVICE_HMAC_SECRET, "device-a"),
      rebind_count: 0,
      last_rebind_at: null,
      created_by: null,
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z",
      app_public_id: app.app_id,
      app_name: app.name,
      app_platform: app.platform,
      app_status: app.status,
      plan_code: "monthly",
      plan_name: "月卡",
      duration_days: 30
    };
    const passwordRecord = await hashPassword("old-admin-password");
    const admin = {
      id: 1,
      tenant_id: 1,
      tenant_name: "默认租户",
      tenant_status: "active" as const,
      role: "super_admin" as const,
      username: "admin",
      password_hash: passwordRecord.hash,
      password_salt: passwordRecord.salt,
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z"
    };
    return new MemoryRepo(app, code, admin);
  }

  async getAdminByUsername(username: string) {
    return this.admin.username === username ? this.admin : null;
  }

  async getAdminByTenantAndUsername(tenant: string, username: string) {
    const tenantMatches = tenant.toLowerCase() === "default" || tenant.toLowerCase() === this.admin.tenant_name?.toLowerCase();
    return this.admin.username === username && tenantMatches ? this.admin : null;
  }

  async getAdminCredentialsById(id: number) {
    return this.admin.id === id ? this.admin : null;
  }

  async updateAdminPassword(input: { adminId: number; passwordHash: string; passwordSalt: string }) {
    if (this.admin.id !== input.adminId) {
      return false;
    }
    this.admin.password_hash = input.passwordHash;
    this.admin.password_salt = input.passwordSalt;
    this.admin.updated_at = "2026-06-25T00:00:01.000Z";
    return true;
  }

  async getAppByPublicId(appId: string) {
    return this.app.app_id === appId ? this.app : null;
  }

  async findCodeByHash(codeHash: string) {
    return this.code.code_hash === codeHash ? this.code : null;
  }

  async bindUnboundDevice(input: { codeId: number; deviceHash: string; boundAt: string }) {
    if (this.code.id !== input.codeId || this.code.status !== CODE_STATUS.ACTIVE || this.code.disabled_at || this.code.device_hash) {
      return false;
    }
    this.code.device_hash = input.deviceHash;
    this.code.updated_at = input.boundAt;
    return true;
  }

  async unbindDevice(input: { codeId: number; deviceHash: string; unboundAt: string; maxRebinds: number }) {
    if (
      this.code.id !== input.codeId ||
      this.code.status !== CODE_STATUS.ACTIVE ||
      this.code.disabled_at ||
      this.code.device_hash !== input.deviceHash ||
      this.code.rebind_count >= input.maxRebinds
    ) {
      return false;
    }
    this.code.device_hash = null;
    this.code.rebind_count += 1;
    this.code.last_rebind_at = input.unboundAt;
    this.code.updated_at = input.unboundAt;
    return true;
  }

  async manuallyUnbindDevice(input: { codeId: number; changedAt: string }) {
    if (this.code.id !== input.codeId || this.code.status !== CODE_STATUS.ACTIVE || this.code.disabled_at || !this.code.device_hash) {
      return false;
    }
    this.code.device_hash = null;
    this.code.updated_at = input.changedAt;
    return true;
  }

  async insertLog(input: LogInput) {
    this.logs.push(input);
  }

  // --- versions ---
  readonly versions: VersionRow[] = [];

  async listVersions(filters: { tenantId: number; appId?: string; status?: string; page: number; pageSize: number }) {
    const all = this.versions.filter((v) => {
      if (v.deleted_at) {
        return false;
      }
      if (v.app_id !== this.app.id) {
        return false;
      }
      if (filters.status && v.status !== filters.status) {
        return false;
      }
      return true;
    });
    const offset = (filters.page - 1) * filters.pageSize;
    return {
      items: all.slice(offset, offset + filters.pageSize).map((v) => ({
        ...v,
        app_public_id: this.app.app_id,
        app_name: this.app.name,
        tenant_id: this.app.tenant_id
      })),
      total: all.length
    };
  }

  async getVersionById(versionId: number) {
    return this.versions.find((v) => v.id === versionId && !v.deleted_at) ?? null;
  }

  async getVersionWithTenant(versionId: number) {
    const version = await this.getVersionById(versionId);
    return version ? { ...version, tenant_id: this.app.tenant_id } : null;
  }

  async getVersionByAppAndCode(appDbId: number, versionCode: number) {
    return this.versions.find((v) => v.app_id === appDbId && v.version_code === versionCode && !v.deleted_at) ?? null;
  }

  async createVersion(input: {
    appDbId: number;
    version: string;
    versionCode: number;
    releaseNotes: string;
    downloadUrl?: string;
    isForced: boolean;
    createdBy: number;
  }) {
    const version: VersionRow = {
      id: this.versions.length + 1,
      app_id: input.appDbId,
      version: input.version,
      version_code: input.versionCode,
      release_notes: input.releaseNotes,
      download_url: input.downloadUrl ?? "",
      is_forced: input.isForced ? 1 : 0,
      status: "draft",
      published_at: null,
      created_by: input.createdBy,
      created_at: "2026-06-25T00:00:00.000Z",
      updated_at: "2026-06-25T00:00:00.000Z",
      deleted_at: null
    };
    this.versions.push(version);
    return version;
  }

  async updateVersion(input: { versionId: number; version: string; versionCode: number; releaseNotes: string; downloadUrl?: string; isForced: boolean }) {
    const version = await this.getVersionById(input.versionId);
    if (!version) {
      return null;
    }
    version.version = input.version;
    version.version_code = input.versionCode;
    version.release_notes = input.releaseNotes;
    version.download_url = input.downloadUrl ?? "";
    version.is_forced = input.isForced ? 1 : 0;
    version.updated_at = "2026-06-25T00:00:01.000Z";
    return version;
  }

  async publishVersion(versionId: number, publishedAt: string) {
    const version = await this.getVersionById(versionId);
    if (!version || version.status !== "draft") {
      return false;
    }
    version.status = "published";
    version.published_at = publishedAt;
    version.updated_at = publishedAt;
    return true;
  }

  async unpublishVersion(versionId: number) {
    const version = await this.getVersionById(versionId);
    if (!version || version.status !== "published") {
      return false;
    }
    version.status = "draft";
    version.published_at = null;
    version.updated_at = "2026-06-25T00:00:01.000Z";
    return true;
  }

  async softDeleteVersion(versionId: number) {
    const version = await this.getVersionById(versionId);
    if (!version) {
      return false;
    }
    version.deleted_at = "2026-06-25T00:00:01.000Z";
    return true;
  }

  async getLatestPublishedVersion(appDbId: number) {
    const published = this.versions.filter((v) => v.app_id === appDbId && v.status === "published" && !v.deleted_at);
    if (published.length === 0) {
      return null;
    }
    return [...published].sort((a, b) => b.version_code - a.version_code)[0];
  }
}

describe("LicenseService version management", () => {
  let repo: MemoryRepo;
  let service: LicenseService;

  beforeEach(async () => {
    repo = await MemoryRepo.create();
    service = new LicenseService(repo as unknown as Repository, env);
  });

  it("creates a draft version and logs the action", async () => {
    const result = await service.createVersion({
      tenantId: 1,
      appId: repo.app.app_id,
      version: "1.0.0",
      versionCode: 100,
      releaseNotes: "首个版本",
      downloadUrl: "https://example.com/app-v1.zip",
      isForced: false,
      adminId: 1
    });
    expect(result.version.version).toBe("1.0.0");
    expect(result.version.status).toBe("draft");
    expect(result.version.is_forced).toBe(0);
    expect(repo.logs.at(-1)).toMatchObject({
      action: LOG_ACTION.CREATE_VERSION,
      result: LOG_RESULT.SUCCESS
    });
  });

  it("rejects duplicate version codes for the same app", async () => {
    await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    await expect(
      service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.1", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 })
    ).rejects.toMatchObject({ code: "VERSION_CODE_CONFLICT" });
  });

  it("publishes a draft version and prevents republishing", async () => {
    const created = await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: true, adminId: 1 });
    const published = await service.publishVersion({ tenantId: 1, versionId: created.version.id, adminId: 1 });
    expect(published.updated).toBe(true);
    expect(repo.versions[0].status).toBe("published");
    expect(repo.versions[0].published_at).not.toBeNull();
    await expect(
      service.publishVersion({ tenantId: 1, versionId: created.version.id, adminId: 1 })
    ).rejects.toMatchObject({ code: "VERSION_NOT_PUBLISHABLE" });
  });

  it("unpublishes a published version back to draft", async () => {
    const created = await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    await service.publishVersion({ tenantId: 1, versionId: created.version.id, adminId: 1 });
    const unpublished = await service.unpublishVersion({ tenantId: 1, versionId: created.version.id, adminId: 1 });
    expect(unpublished.updated).toBe(true);
    expect(repo.versions[0].status).toBe("draft");
    expect(repo.versions[0].published_at).toBeNull();
  });

  it("updates a version and detects code conflicts on change", async () => {
    const a = await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "2.0.0", versionCode: 200, releaseNotes: "", isForced: false, adminId: 1 });
    const updated = await service.updateVersion({ tenantId: 1, versionId: a.version.id, version: "1.0.1", releaseNotes: "修复", isForced: true, adminId: 1 });
    expect(updated.version.version).toBe("1.0.1");
    expect(updated.version.release_notes).toBe("修复");
    expect(updated.version.is_forced).toBe(1);
    await expect(
      service.updateVersion({ tenantId: 1, versionId: a.version.id, versionCode: 200, adminId: 1 })
    ).rejects.toMatchObject({ code: "VERSION_CODE_CONFLICT" });
  });

  it("soft deletes a version and hides it from queries", async () => {
    const created = await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    const deleted = await service.deleteVersion({ tenantId: 1, versionId: created.version.id, adminId: 1 });
    expect(deleted.deleted).toBe(true);
    const list = await service.listVersions({ tenantId: 1, page: 1, pageSize: 20 });
    expect(list.total).toBe(0);
  });

  it("hides versions of other tenants", async () => {
    const created = await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    await expect(
      service.deleteVersion({ tenantId: 999, versionId: created.version.id, adminId: 1 })
    ).rejects.toMatchObject({ code: "VERSION_NOT_FOUND" });
  });

  it("returns the latest published version with update_required to clients", async () => {
    const empty = await service.getClientLatestVersion({ appId: repo.app.app_id, appSecret: MemoryRepo.appSecret, currentVersionCode: 100 });
    expect(empty.latest).toBeNull();
    expect(empty.update_required).toBe(false);

    await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "2.0.0", versionCode: 200, releaseNotes: "强制更新", isForced: true, adminId: 1 });
    await service.publishVersion({ tenantId: 1, versionId: 1, adminId: 1 });
    await service.publishVersion({ tenantId: 1, versionId: 2, adminId: 1 });

    const outdated = await service.getClientLatestVersion({ appId: repo.app.app_id, appSecret: MemoryRepo.appSecret, currentVersionCode: 100 });
    expect(outdated.latest).toMatchObject({ version: "2.0.0", version_code: 200, is_forced: true });
    expect(outdated.update_required).toBe(true);

    const upToDate = await service.getClientLatestVersion({ appId: repo.app.app_id, appSecret: MemoryRepo.appSecret, currentVersionCode: 200 });
    expect(upToDate.update_required).toBe(false);
  });

  it("attaches latest_version to app-info", async () => {
    const before = await service.getClientAppInfo({ appId: repo.app.app_id, appSecret: MemoryRepo.appSecret });
    expect(before.latest_version).toBeNull();

    await service.createVersion({ tenantId: 1, appId: repo.app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 1 });
    await service.publishVersion({ tenantId: 1, versionId: 1, adminId: 1 });
    const after = await service.getClientAppInfo({ appId: repo.app.app_id, appSecret: MemoryRepo.appSecret });
    expect(after.latest_version).toMatchObject({ version: "1.0.0", version_code: 100 });
  });
});
