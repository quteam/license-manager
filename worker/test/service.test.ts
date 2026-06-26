import { beforeEach, describe, expect, it } from "vitest";
import { APP_STATUS, CODE_STATUS, LOG_ACTION, LOG_RESULT, type LogAction, type LogResult } from "../src/constants";
import { hmacSha256, normalizeCode } from "../src/crypto";
import { Repository } from "../src/repository";
import { LicenseService } from "../src/service";
import { ApiError, type AppRow, type Bindings, type CodeDetailRow, type ErrorCode } from "../src/types";

const env = {
  CODE_HMAC_SECRET: "code-secret",
  APP_SECRET_HMAC_SECRET: "app-secret-secret",
  DEVICE_HMAC_SECRET: "device-secret",
  JWT_SECRET: "jwt-secret"
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

  private constructor(app: AppRow, code: CodeDetailRow) {
    this.app = app;
    this.code = code;
  }

  static async create() {
    const app: AppRow = {
      id: 1,
      app_id: "app_test",
      name: "Test App",
      description: null,
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
      expires_at: "2026-07-25T08:00:00.000Z",
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
    return new MemoryRepo(app, code);
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
}
