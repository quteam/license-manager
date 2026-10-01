import { beforeEach, describe, expect, it } from "vitest";
import { BlobRepository } from "../src/blobstore/blob-repository";
import { MemoryBlobKv } from "../src/blobstore/kv";
import { APP_STATUS, CODE_STATUS, LOG_ACTION, LOG_RESULT, TENANT_STATUS } from "../src/constants";
import { hmacSha256, normalizeCode } from "../src/crypto";
import { Repository } from "../src/repository";
import { LicenseService } from "../src/service";
import type { AppRow, Bindings, CodeDetailRow } from "../src/types";

const env = {
  CODE_HMAC_SECRET: "code-secret",
  APP_SECRET_HMAC_SECRET: "app-secret-secret",
  DEVICE_HMAC_SECRET: "device-secret",
  JWT_SECRET: "jwt-secret",
  CODE_PLAINTEXT_ENCRYPTION_KEY: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
  ADMIN_BOOTSTRAP_USERNAME: "admin",
  ADMIN_BOOTSTRAP_PASSWORD: "recovery-secret"
} as Bindings;

const keylessEnv = { ...env, CODE_PLAINTEXT_ENCRYPTION_KEY: undefined } as Bindings;

async function setup(envOverride: Bindings = env) {
  const repo = await new BlobRepository(new MemoryBlobKv()).ready();
  const service = new LicenseService(repo as unknown as Repository, envOverride);
  return { repo, service };
}

async function createTestApp(repo: BlobRepository, appId = "app_test") {
  return await repo.createApp({
    tenantId: 1,
    appId,
    name: "Test App",
    platform: "desktop",
    status: APP_STATUS.ACTIVE,
    appSecretHash: await hmacSha256(env.APP_SECRET_HMAC_SECRET, "sec_test")
  });
}

function codeHash(code: string): Promise<string> {
  return hmacSha256(env.CODE_HMAC_SECRET, normalizeCode(code));
}

describe("BlobRepository seed", () => {
  it("seeds plans and the default tenant once", async () => {
    const { repo } = await setup();
    const plans = await repo.getPlans();
    expect(plans.map((plan) => plan.code)).toEqual(["daily", "two_day", "three_day", "weekly", "monthly", "quarterly", "yearly", "lifetime"]);
    const monthly = await repo.getPlanByCode("monthly");
    expect(monthly).toMatchObject({ name: "月卡", duration_days: 30 });
    const tenant = await repo.getTenantById(1);
    expect(tenant).toMatchObject({ name: "默认租户", slug: "default", status: TENANT_STATUS.ACTIVE });
  });
});

describe("BlobRepository admin auth", () => {
  it("bootstraps the super admin on first login and authenticates", async () => {
    const { service } = await setup();
    const admin = await service.authenticateAdmin("default", "admin", "recovery-secret");
    expect(admin).toMatchObject({ username: "admin", role: "super_admin", tenant_id: 1, tenant_name: "默认租户" });
    await expect(service.authenticateAdmin("default", "admin", "wrong")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.authenticateAdmin("other", "admin", "recovery-secret")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps bootstrap idempotent across calls", async () => {
    const { repo, service } = await setup();
    await service.authenticateAdmin("default", "admin", "recovery-secret");
    await service.authenticateAdmin("默认租户", "admin", "recovery-secret");
    expect(await repo.getAdminByUsername("admin")).not.toBeNull();
  });
});

describe("BlobRepository tenants", () => {
  it("creates tenants with unique slugs and lists counts", async () => {
    const { repo, service } = await setup();
    await service.authenticateAdmin("default", "admin", "recovery-secret");
    const created = await service.createTenant({
      name: "Customer A",
      slug: "customer-a",
      status: TENANT_STATUS.ACTIVE,
      adminUsername: "a-admin",
      adminPassword: "a-password-123"
    });
    expect(created.tenant.slug).toBe("customer-a");
    expect(created.admins).toHaveLength(1);

    const tenants = await repo.listTenants();
    const row = tenants.find((tenant) => tenant.slug === "customer-a");
    expect(row).toMatchObject({ admin_count: 1, app_count: 0, admin_usernames: "a-admin" });

    await expect(
      service.createTenant({
        name: "Dup",
        slug: "customer-a",
        status: TENANT_STATUS.ACTIVE,
        adminUsername: "b-admin",
        adminPassword: "b-password-123"
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      service.createTenant({
        name: "Dup",
        slug: "customer-b",
        status: TENANT_STATUS.ACTIVE,
        adminUsername: "a-admin",
        adminPassword: "b-password-123"
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates tenant name and slug with uniqueness enforcement", async () => {
    const { repo, service } = await setup();
    await service.authenticateAdmin("default", "admin", "recovery-secret");
    const a = await service.createTenant({ name: "A", slug: "tenant-a", status: TENANT_STATUS.ACTIVE, adminUsername: "ta", adminPassword: "password-123" });
    await service.createTenant({ name: "B", slug: "tenant-b", status: TENANT_STATUS.ACTIVE, adminUsername: "tb", adminPassword: "password-123" });

    const updated = await repo.updateTenant({ id: a.tenant.id, name: "A2", slug: "tenant-a2" });
    expect(updated).toMatchObject({ name: "A2", slug: "tenant-a2" });
    await expect(repo.updateTenant({ id: a.tenant.id, name: "A3", slug: "tenant-b" })).rejects.toThrowError(/UNIQUE/);

    const statusChanged = await repo.updateTenantStatus(a.tenant.id, TENANT_STATUS.DISABLED);
    expect(statusChanged).toBe(true);
  });

  it("deletes only empty non-default tenants", async () => {
    const { repo, service } = await setup();
    await service.authenticateAdmin("default", "admin", "recovery-secret");
    const created = await service.createTenant({ name: "C", slug: "tenant-c", status: TENANT_STATUS.ACTIVE, adminUsername: "tc", adminPassword: "password-123" });
    expect(await repo.deleteTenantIfEmpty(1)).toBe(false);
    expect(await repo.deleteTenantIfEmpty(created.tenant.id)).toBe(true);
    expect(await repo.getTenantById(created.tenant.id)).toBeNull();
    expect(await repo.getAdminByUsername("tc")).toBeNull();
  });
});

describe("BlobRepository apps", () => {
  it("creates apps with globally unique public ids and joins tenant status", async () => {
    const { repo } = await setup();
    const app = await createTestApp(repo);
    expect(app.tenant_status).toBe(TENANT_STATUS.ACTIVE);
    expect(app.app_id).toBe("app_test");
    await expect(
      repo.createApp({
        tenantId: 1,
        appId: "app_test",
        name: "Dup",
        platform: "web",
        status: APP_STATUS.ACTIVE,
        appSecretHash: "x"
      })
    ).rejects.toThrowError(/UNIQUE/);
    expect((await repo.listApps(1)).map((row) => row.app_id)).toEqual(["app_test"]);
  });

  it("updates apps scoped by tenant and rotates secrets", async () => {
    const { repo } = await setup();
    const app = await createTestApp(repo);
    expect(await repo.updateAppStatus(app.app_id, 999, APP_STATUS.DISABLED)).toBe(false);
    expect(await repo.updateAppStatus(app.app_id, 1, APP_STATUS.DISABLED)).toBe(true);
    const updated = await repo.updateApp({ appId: app.app_id, tenantId: 1, name: "Renamed", platform: "desktop", description: "desc" });
    expect(updated).toMatchObject({ name: "Renamed", status: APP_STATUS.DISABLED, description: "desc" });
    const rotated = await repo.updateAppSecretHash(app.app_id, 1, "new-hash");
    expect(rotated?.app_secret_hash).toBe("new-hash");
    expect(await repo.updateAppSecretHash(app.app_id, 999, "x")).toBe(null);
  });
});

describe("BlobRepository code lifecycle", () => {
  it("generates codes, activates, verifies, unbinds and rebinds without resetting the period", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 3, note: "测试批次", adminId: 9 });
    expect(generated.codes).toHaveLength(3);

    const code = generated.codes[0];
    const license = await service.activate({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-a" });
    expect(license).toMatchObject({ valid: true, device_bound: true, plan: { code: "monthly", duration_days: 30 } });
    expect(new Date(license.expires_at).getTime() - new Date(license.activated_at).getTime()).toBeGreaterThan(29 * 24 * 3600 * 1000);

    const again = await service.activate({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-a" });
    expect(again.expires_at).toBe(license.expires_at);

    await expect(
      service.verify({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-b" })
    ).rejects.toMatchObject({ code: "DEVICE_MISMATCH" });
    const verified = await service.verify({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-a" });
    expect(verified.valid).toBe(true);

    const unbound = await service.unbindDevice({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-a" });
    expect(unbound.device_bound).toBe(false);
    expect(unbound.rebind_count).toBe(1);

    const rebound = await service.activate({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-b" });
    expect(rebound.rebind_count).toBe(1);
    expect(rebound.expires_at).toBe(license.expires_at);

    await expect(
      service.unbindDevice({ appId: app.app_id, appSecret: "sec_test", code, deviceFingerprint: "device-b" })
    ).rejects.toMatchObject({ code: "REBINDS_TOO_FREQUENT" });

    const detail = (await repo.findCodeByHash(await codeHash(code))) as CodeDetailRow;
    expect(detail.status).toBe(CODE_STATUS.ACTIVE);
  });

  it("enforces rebind limit and cooldown semantics through the repository", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "daily", quantity: 1, adminId: 9 });
    const code = generated.codes[0];
    const base = { appId: app.app_id, appSecret: "sec_test", code };

    await service.activate({ ...base, deviceFingerprint: "d1" });
    for (let count = 1; count <= 3; count += 1) {
      // 冷却 24h：直接通过 repository 绕过冷却限制验证次数上限
      const codeId = (await repo.findCodeByHash(await codeHash(code)))!.id;
      const unbound = await repo.unbindDevice({
        codeId,
        deviceHash: await hmacSha256(env.DEVICE_HMAC_SECRET, `d${count}`),
        unboundAt: new Date(Date.now() + count * 25 * 3600 * 1000).toISOString(),
        maxRebinds: 3
      });
      expect(unbound).toBe(true);
      if (count < 3) {
        await service.activate({ ...base, deviceFingerprint: `d${count + 1}` });
      }
    }
    const detail = (await repo.findCodeByHash(await codeHash(code)))!;
    expect(detail.rebind_count).toBe(3);
    await service.activate({ ...base, deviceFingerprint: "d4" });
    await expect(service.unbindDevice({ ...base, deviceFingerprint: "d4" })).rejects.toMatchObject({ code: "REBINDS_EXCEEDED" });
  });

  it("lists codes with filters, derived statuses and pagination", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 5, adminId: 9 });
    const activatedCode = generated.codes[0];
    await service.activate({ appId: app.app_id, appSecret: "sec_test", code: activatedCode, deviceFingerprint: "device-a" });

    const expiredCode = generated.codes[1];
    const expiredHash = await codeHash(expiredCode);
    const expiredRecord = (await repo.findCodeByHash(expiredHash))!;
    const pastIso = "2020-01-01T00:00:00.000Z";
    await repo.activateCode({ codeId: expiredRecord.id, deviceHash: await hmacSha256(env.DEVICE_HMAC_SECRET, "device-x"), activatedAt: "2020-01-01T00:00:00.000Z", expiresAt: pastIso });

    const disabledCode = generated.codes[2];
    const disabledRecord = (await repo.findCodeByHash(await codeHash(disabledCode)))!;
    await repo.updateCodeDisabled({ codeId: disabledRecord.id, tenantId: 1, disabled: true, changedAt: new Date().toISOString() });

    const all = await repo.listCodes({ tenantId: 1, page: 1, pageSize: 20 });
    expect(all.total).toBe(5);

    // 与 SQL 语义一致：status=active 不排除已过期（过期是派生态）
    const active = await repo.listCodes({ tenantId: 1, status: CODE_STATUS.ACTIVE, page: 1, pageSize: 20 });
    expect(active.total).toBe(2);
    expect(active.items.map((item) => item.code_suffix)).toContain(activatedCode.replaceAll("-", "").slice(-6));

    const expired = await repo.listCodes({ tenantId: 1, status: "expired", page: 1, pageSize: 20 });
    expect(expired.total).toBe(1);

    const disabled = await repo.listCodes({ tenantId: 1, status: "disabled", page: 1, pageSize: 20 });
    expect(disabled.total).toBe(1);

    const paged = await repo.listCodes({ tenantId: 1, page: 2, pageSize: 3 });
    expect(paged.items).toHaveLength(2);

    const byPlan = await repo.listCodes({ tenantId: 1, planCode: "monthly", page: 1, pageSize: 20 });
    expect(byPlan.total).toBe(5);
    expect(byPlan.items[0]).toMatchObject({ plan_code: "monthly", plan_name: "月卡", duration_days: 30, app_id: "app_test", app_name: "Test App" });

    const bySuffix = await repo.listCodes({ tenantId: 1, query: activatedCode.replaceAll("-", "").slice(-6), page: 1, pageSize: 20 });
    expect(bySuffix.total).toBe(1);

    const byApp = await repo.listCodes({ tenantId: 1, appId: "other_app", page: 1, pageSize: 20 });
    expect(byApp.total).toBe(0);
  });

  it("soft deletes and hard deletes codes with tenant scoping", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "weekly", quantity: 2, adminId: 9 });
    const target = (await repo.findCodeByHash(await codeHash(generated.codes[0])))!;

    expect(await repo.softDeleteCode(target.id, 999)).toBe(false);
    expect(await repo.softDeleteCode(target.id, 1)).toBe(true);
    await expect(
      service.verify({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "d" })
    ).rejects.toMatchObject({ code: "CODE_DELETED" });

    expect(await repo.hardDeleteCode(target.id, 1)).toBe(true);
    expect(await repo.findCodeByHash(await codeHash(generated.codes[0]))).toBeNull();
    expect(await repo.getCodeById(target.id, 1)).toBeNull();

    const other = (await repo.findCodeByHash(await codeHash(generated.codes[1])))!;
    expect(await repo.hardDeleteCode(other.id, 1)).toBe(true);
  });

  it("manually unbinds without consuming the self-service quota", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "weekly", quantity: 1, adminId: 9 });
    await service.activate({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "device-a" });
    const detail = (await repo.findCodeByHash(await codeHash(generated.codes[0])))!;
    expect(await repo.manuallyUnbindDevice({ codeId: detail.id, tenantId: 1, changedAt: new Date().toISOString() })).toBe(true);
    const after = (await repo.findCodeByHash(await codeHash(generated.codes[0])))!;
    expect(after.device_hash).toBeNull();
    expect(after.rebind_count).toBe(0);
  });
});

describe("BlobRepository distributor claim", () => {
  it("claims unused encrypted codes in id order and exhausts eventually", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 3, adminId: 9 });

    const first = await repo.claimNextCode({ appDbId: app.id, tenantId: 1 });
    expect(first).toMatchObject({ codeSuffix: generated.codes[0].replaceAll("-", "").slice(-6), planCode: "monthly" });
    expect((await repo.findCodeByHash(first!.codeHash))!.status).toBe(CODE_STATUS.ISSUED);

    const filtered = await repo.claimNextCode({ appDbId: app.id, tenantId: 1, planCode: "weekly" });
    expect(filtered).toBeNull();

    const second = await repo.claimNextCode({ appDbId: app.id, tenantId: 1, planCode: "monthly" });
    expect(second?.codeSuffix).toBe(generated.codes[1].replaceAll("-", "").slice(-6));
    await repo.claimNextCode({ appDbId: app.id, tenantId: 1 });
    expect(await repo.claimNextCode({ appDbId: app.id, tenantId: 1 })).toBeNull();
  });

  it("returns null when codes carry no encrypted plaintext", async () => {
    const { repo, service } = await setup(keylessEnv);
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 2, adminId: 9 });
    expect(generated.codes).toHaveLength(2);
    expect(await repo.claimNextCode({ appDbId: app.id, tenantId: 1 })).toBeNull();
    await expect(
      service.claimNextCode({ appId: app.app_id, appSecret: "sec_test" })
    ).rejects.toMatchObject({ code: "ENCRYPTION_KEY_NOT_CONFIGURED" });
  });
});

describe("BlobRepository app deletion and versions", () => {
  it("refuses deleting apps with live codes and cascades after cleanup", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 2, adminId: 9 });
    await service.activate({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "device-a" });

    expect(await repo.deleteAppWithData(app.id)).toBe(false);

    for (const code of generated.codes) {
      const record = (await repo.findCodeByHash(await codeHash(code)))!;
      await repo.softDeleteCode(record.id, 1);
    }
    expect(await repo.deleteAppWithData(app.id)).toBe(true);
    expect(await repo.getAppByPublicId(app.app_id)).toBeNull();
    expect(await repo.listCodes({ tenantId: 1, page: 1, pageSize: 20 }).then((result) => result.total)).toBe(0);
  });

  it("manages version lifecycle and latest published lookup", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const v1 = await service.createVersion({ tenantId: 1, appId: app.app_id, version: "1.0.0", versionCode: 100, releaseNotes: "", isForced: false, adminId: 9 });
    const v2 = await service.createVersion({ tenantId: 1, appId: app.app_id, version: "2.0.0", versionCode: 200, releaseNotes: "", isForced: true, adminId: 9 });
    await expect(
      service.createVersion({ tenantId: 1, appId: app.app_id, version: "2.0.1", versionCode: 200, releaseNotes: "", isForced: false, adminId: 9 })
    ).rejects.toMatchObject({ code: "VERSION_CODE_CONFLICT" });

    const listed = await repo.listVersions({ tenantId: 1, page: 1, pageSize: 10 });
    expect(listed.total).toBe(2);
    expect(listed.items[0]?.version).toBe("2.0.0");

    await service.publishVersion({ tenantId: 1, versionId: v1.version.id, adminId: 9 });
    await service.publishVersion({ tenantId: 1, versionId: v2.version.id, adminId: 9 });
    const latest = await repo.getLatestPublishedVersion(app.id);
    expect(latest).toMatchObject({ version: "2.0.0", is_forced: 1 });

    const withTenant = await repo.getVersionWithTenant(v1.version.id);
    expect(withTenant).toMatchObject({ tenant_id: 1 });
    expect(await repo.getVersionWithTenant(99999)).toBeNull();

    await service.unpublishVersion({ tenantId: 1, versionId: v2.version.id, adminId: 9 });
    expect(await repo.getLatestPublishedVersion(app.id)).toMatchObject({ version: "1.0.0" });

    await service.deleteVersion({ tenantId: 1, versionId: v1.version.id, adminId: 9 });
    expect(await repo.getVersionById(v1.version.id)).toBeNull();
    expect((await repo.listVersions({ tenantId: 1, page: 1, pageSize: 10 })).total).toBe(1);
  });
});

describe("BlobRepository logs and dashboard", () => {
  it("records denormalized logs with filters and pagination", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 1, adminId: 9 });
    await service.activate({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "device-a" });
    await service.verify({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "device-a" });
    await expect(
      service.verify({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "device-b" })
    ).rejects.toMatchObject({ code: "DEVICE_MISMATCH" });

    const all = await repo.listLogs({ tenantId: 1, page: 1, pageSize: 2 });
    expect(all.total).toBeGreaterThanOrEqual(4);
    expect(all.items).toHaveLength(2);
    expect((all.items[0]?.created_at ?? "") >= (all.items[1]?.created_at ?? "")).toBe(true);

    const activations = await repo.listLogs({ tenantId: 1, action: LOG_ACTION.ACTIVATE, page: 1, pageSize: 10 });
    expect(activations.total).toBe(1);
    expect(activations.items[0]).toMatchObject({ result: LOG_RESULT.SUCCESS, app_id: "app_test" });

    const failures = await repo.listLogs({ tenantId: 1, action: LOG_ACTION.VERIFY, page: 1, pageSize: 10 });
    expect(failures.items.some((item) => item.result === LOG_RESULT.FAILURE && item.error_code === "DEVICE_MISMATCH")).toBe(true);
  });

  it("computes dashboard statistics from indexes", async () => {
    const { repo, service } = await setup();
    const app = await createTestApp(repo);
    const generated = await service.generateCodes({ tenantId: 1, appId: app.app_id, planCode: "monthly", quantity: 5, adminId: 9 });
    await service.activate({ appId: app.app_id, appSecret: "sec_test", code: generated.codes[0], deviceFingerprint: "device-a" });

    const stats = await repo.getDashboardStats(1);
    expect(stats.overview).toMatchObject({ apps_total: 1, apps_active: 1, codes_total: 5, codes_unused: 4, codes_active: 1 });
    expect(stats.app_code_ranking).toHaveLength(1);
    expect(stats.app_code_ranking[0]).toMatchObject({ app_id: "app_test", total: 5, active: 1, unused: 4 });
    expect(stats.plan_distribution.find((row) => row.plan_code === "monthly")?.count).toBe(5);
    expect(stats.log_trend).toHaveLength(7);
    expect(stats.log_trend[6].success).toBeGreaterThan(0);
    expect(stats.overview.logs_today).toBeGreaterThan(0);
    expect(stats.code_trend).toHaveLength(7);
  });
});
