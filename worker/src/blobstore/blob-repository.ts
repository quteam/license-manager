import {
  ADMIN_ROLE,
  APP_STATUS,
  CODE_DERIVED_STATUS,
  CODE_STATUS,
  LOG_ACTION,
  LOG_RESULT
} from "../constants";
import {
  type ActivationCodeInsertInput,
  type CodeListFilters,
  type CodeListItem,
  type CreateVersionInput,
  type LogListFilters,
  type LogListItem,
  type UpdateVersionInput,
  type VersionListFilters
} from "../repository";
import { nowIso } from "../time";
import {
  AdminUserRow,
  AppRow,
  AppStatus,
  CodeDetailRow,
  CodeStatus,
  DashboardStats,
  LogAction,
  LogResult,
  PlanRow,
  TenantRow,
  TenantStatus,
  VersionListItem,
  VersionRow
} from "../types";
import { CasConflictError, DocStore, IdAllocator, PreconditionFailedError, type Versioned } from "./docstore";
import type { BlobKv } from "./kv";
import { DEFAULT_TENANT_ID, ensureSeeded } from "./seed";

/**
 * EdgeOne Pages Blob 存储驱动：与 D1 版 Repository 实现同一组方法契约，
 * service 层无感知。设计要点：
 * - 记录文档（code/{hash}、app/{id} 等）是唯一事实源；
 * - 所有状态流转 = 版本化 CAS mutate + 前置条件校验（等价 preconditioned UPDATE）；
 * - 辅助索引（appcodes、logday 等）在记录写入之后更新，崩溃导致的陈旧由读路径自愈；
 * - 唯一约束（租户 slug、用户名、app_id、code_hash）用 create-if-absent 指针键实现，
 *   冲突错误消息包含 “UNIQUE” 以复用 service 层的冲突识别。
 */

type AdminRecord = {
  id: number;
  tenant_id: number | null;
  role: AdminUserRow["role"];
  username: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
};

type AdminJoined = AdminUserRow & { tenant_name: string | null; tenant_status: TenantStatus | null };

type AppRecord = {
  id: number;
  tenant_id: number;
  app_id: string;
  name: string;
  description: string | null;
  purchase_url: string | null;
  platform: string;
  status: AppStatus;
  app_secret_hash: string;
  created_at: string;
  updated_at: string;
};

type BatchRecord = {
  id: number;
  app_id: number;
  plan_id: number;
  quantity: number;
  note: string | null;
  created_by: number | null;
  created_at: string;
};

type CodeRecord = {
  id: number;
  batch_id: number | null;
  app_id: number;
  plan_id: number;
  code_hash: string;
  code_suffix: string;
  status: CodeStatus;
  disabled_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  device_hash: string | null;
  rebind_count: number;
  last_rebind_at: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  issued_at: string | null;
  issued_to: string | null;
  code_plaintext_encrypted: string | null;
};

type CodeIndexEntry = {
  id: number;
  hash: string;
  suffix: string;
  status: CodeStatus;
  disabled: boolean;
  activated_at: string | null;
  expires_at: string | null;
  plan_id: number;
  created_at: string;
  has_plaintext: boolean;
};

type AppCodesIndex = { entries: CodeIndexEntry[] };

type LogEntry = {
  id: number;
  app_db_id: number | null;
  code_db_id: number | null;
  action: LogAction;
  result: LogResult;
  device_hash: string | null;
  error_code: string | null;
  message: string | null;
  created_at: string;
  code_suffix: string | null;
  app_id: string | null;
  app_name: string | null;
};

type DailyLogStats = { total: number; success: number; client_failures: number };

const CLIENT_LOG_ACTIONS = new Set<string>([LOG_ACTION.ACTIVATE, LOG_ACTION.VERIFY, LOG_ACTION.UNBIND_DEVICE]);
const MAX_LOG_SHARD_SCAN = 250;
/** 激活码列表单页并行读 Blob 的并发上限：避免串行导致耗时随 page_size 线性增长 */
const CODE_PAGE_READ_CONCURRENCY = 32;

export class BlobRepository {
  readonly store: DocStore;
  private readonly ids: {
    tenants: IdAllocator;
    admins: IdAllocator;
    apps: IdAllocator;
    batches: IdAllocator;
    codes: IdAllocator;
    versions: IdAllocator;
    logs: IdAllocator;
  };

  constructor(kv: BlobKv) {
    this.store = new DocStore(kv);
    this.ids = {
      tenants: new IdAllocator(this.store, "tenants"),
      admins: new IdAllocator(this.store, "admins"),
      apps: new IdAllocator(this.store, "apps"),
      batches: new IdAllocator(this.store, "batches"),
      codes: new IdAllocator(this.store, "codes", 64),
      versions: new IdAllocator(this.store, "versions"),
      logs: new IdAllocator(this.store, "logs", 64)
    };
  }

  /** 首次使用前完成种子数据写入（幂等） */
  async ready(): Promise<this> {
    await ensureSeeded(this.store);
    return this;
  }

  // ---------- 套餐 ----------

  async getPlans(): Promise<PlanRow[]> {
    const index = await this.store.readData<{ ids: number[] }>("plans");
    const plans = await Promise.all((index?.ids ?? []).map((id) => this.store.readData<PlanRow>(`plan/${id}`)));
    return (plans.filter((plan): plan is PlanRow => plan !== null).sort((a, b) => a.sort_order - b.sort_order));
  }

  async getPlanByCode(code: string): Promise<PlanRow | null> {
    const pointer = await this.store.readData<{ id: number }>(`plancode/${code}`);
    if (!pointer) {
      return null;
    }
    return await this.store.readData<PlanRow>(`plan/${pointer.id}`);
  }

  // ---------- 租户 ----------

  async listTenants(): Promise<Array<TenantRow & { admin_count: number; app_count: number; admin_usernames: string | null }>> {
    const index = await this.store.readData<{ ids: number[] }>("tenants");
    const tenants = await Promise.all((index?.ids ?? []).map((id) => this.store.readData<TenantRow>(`tenant/${id}`)));
    const rows = tenants.filter((tenant): tenant is TenantRow => tenant !== null);
    const result = await Promise.all(
      rows.map(async (tenant) => {
        const adminIds = (await this.store.readData<{ ids: number[] }>(`tenantadmins/${tenant.id}`))?.ids ?? [];
        const admins = await Promise.all(adminIds.map((id) => this.store.readData<AdminRecord>(`admin/${id}`)));
        const usernames = admins
          .filter((admin): admin is AdminRecord => admin !== null)
          .map((admin) => admin.username);
        const appIds = (await this.store.readData<{ ids: number[] }>(`tenantapps/${tenant.id}`))?.ids ?? [];
        return {
          ...tenant,
          admin_count: usernames.length,
          app_count: appIds.length,
          admin_usernames: usernames.length > 0 ? usernames.join(",") : null
        };
      })
    );
    return result.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async getTenantById(id: number): Promise<TenantRow | null> {
    return await this.store.readData<TenantRow>(`tenant/${id}`);
  }

  async createTenant(input: {
    name: string;
    slug: string;
    status: TenantStatus;
    adminUsername: string;
    passwordHash: string;
    passwordSalt: string;
  }): Promise<TenantRow> {
    const now = nowIso();
    const [tenantId] = await this.ids.tenants.allocate(1);
    const [adminId] = await this.ids.admins.allocate(1);

    // 唯一性守卫：slug 与用户名任一冲突都抛 UNIQUE，由 service 层转为 409
    await this.store.create(`tenantslug/${input.slug}`, { id: tenantId });
    try {
      await this.store.create(`adminname/${input.adminUsername}`, { id: adminId });
    } catch (error) {
      await this.store.deleteAll(`tenantslug/${input.slug}`).catch(() => undefined);
      throw error;
    }

    const tenant: TenantRow = {
      id: tenantId,
      name: input.name,
      slug: input.slug,
      status: input.status,
      created_at: now,
      updated_at: now
    };
    try {
      await this.store.create(`tenant/${tenantId}`, tenant);
      await this.store.create(`admin/${adminId}`, {
        id: adminId,
        tenant_id: tenantId,
        role: ADMIN_ROLE.TENANT_ADMIN,
        username: input.adminUsername,
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        created_at: now,
        updated_at: now
      } satisfies AdminRecord);
    } catch (error) {
      await this.store.deleteAll(`tenant/${tenantId}`).catch(() => undefined);
      await this.store.deleteAll(`admin/${adminId}`).catch(() => undefined);
      await this.store.deleteAll(`tenantslug/${input.slug}`).catch(() => undefined);
      await this.store.deleteAll(`adminname/${input.adminUsername}`).catch(() => undefined);
      throw error;
    }
    await this.appendToIndex(`tenantadmins/${tenantId}`, adminId);
    await this.appendToIndex("tenants", tenantId);
    return tenant;
  }

  async updateTenant(input: { id: number; name: string; slug: string }): Promise<TenantRow | null> {
    const current = await this.store.read<TenantRow>(`tenant/${input.id}`);
    if (!current) {
      return null;
    }
    const updated: TenantRow = { ...current.data, name: input.name, slug: input.slug, updated_at: nowIso() };
    if (input.slug !== current.data.slug) {
      await this.store.create(`tenantslug/${input.slug}`, { id: input.id });
      try {
        await this.store.write(`tenant/${input.id}`, updated, current.v);
      } catch (error) {
        await this.store.deleteAll(`tenantslug/${input.slug}`).catch(() => undefined);
        throw error;
      }
      await this.store.deleteAll(`tenantslug/${current.data.slug}`).catch(() => undefined);
      return updated;
    }
    try {
      await this.store.write(`tenant/${input.id}`, updated, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateTenant(input);
      }
      throw error;
    }
    return updated;
  }

  async updateTenantStatus(id: number, status: TenantStatus): Promise<boolean> {
    try {
      await this.mutateExisting<TenantRow>(`tenant/${id}`, (tenant) => ({ ...tenant, status, updated_at: nowIso() }));
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return false;
      }
      throw error;
    }
  }

  async deleteTenantIfEmpty(id: number): Promise<boolean> {
    if (id === DEFAULT_TENANT_ID) {
      return false;
    }
    const tenant = await this.store.readData<TenantRow>(`tenant/${id}`);
    if (!tenant) {
      return false;
    }
    const appIds = (await this.store.readData<{ ids: number[] }>(`tenantapps/${id}`))?.ids ?? [];
    if (appIds.length > 0) {
      return false;
    }
    const adminIds = (await this.store.readData<{ ids: number[] }>(`tenantadmins/${id}`))?.ids ?? [];
    for (const adminId of adminIds) {
      const admin = await this.store.readData<AdminRecord>(`admin/${adminId}`);
      if (admin) {
        await this.store.deleteAll(`adminname/${admin.username}`).catch(() => undefined);
      }
      await this.store.deleteAll(`admin/${adminId}`).catch(() => undefined);
    }
    await this.store.deleteAll(`tenantadmins/${id}`).catch(() => undefined);
    await this.store.deleteAll(`tenantslug/${tenant.slug}`).catch(() => undefined);
    await this.store.deleteAll(`tenant/${id}`).catch(() => undefined);
    await this.removeFromIndex("tenants", id);
    return true;
  }

  // ---------- 应用 ----------

  async listApps(tenantId: number): Promise<Array<Omit<AppRow, "app_secret_hash" | "tenant_status">>> {
    const apps = await this.listTenantApps(tenantId);
    return apps
      .map(({ app_secret_hash: _hash, ...rest }) => rest)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createApp(input: {
    tenantId: number;
    appId: string;
    name: string;
    description?: string;
    purchaseUrl?: string;
    platform: string;
    status: AppStatus;
    appSecretHash: string;
  }): Promise<AppRow> {
    const now = nowIso();
    const [dbId] = await this.ids.apps.allocate(1);
    await this.store.create(`appid/${input.appId}`, { id: dbId });
    const app: AppRecord = {
      id: dbId,
      tenant_id: input.tenantId,
      app_id: input.appId,
      name: input.name,
      description: input.description ?? null,
      purchase_url: input.purchaseUrl ?? null,
      platform: input.platform,
      status: input.status,
      app_secret_hash: input.appSecretHash,
      created_at: now,
      updated_at: now
    };
    try {
      await this.store.create(`app/${dbId}`, app);
    } catch (error) {
      await this.store.deleteAll(`appid/${input.appId}`).catch(() => undefined);
      throw error;
    }
    await this.appendToIndex(`tenantapps/${input.tenantId}`, dbId);
    const tenant = await this.getTenantById(input.tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${input.tenantId} not found after app creation`);
    }
    return { ...app, tenant_status: tenant.status };
  }

  async updateAppStatus(appId: string, tenantId: number, status: AppStatus): Promise<boolean> {
    const current = await this.readAppByPublicId(appId);
    if (!current || current.data.tenant_id !== tenantId) {
      return false;
    }
    try {
      await this.store.write(`app/${current.data.id}`, { ...current.data, status, updated_at: nowIso() }, current.v);
      return true;
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateAppStatus(appId, tenantId, status);
      }
      throw error;
    }
  }

  async updateApp(input: {
    appId: string;
    tenantId: number;
    name: string;
    description?: string;
    purchaseUrl?: string;
    platform: string;
  }): Promise<AppRow | null> {
    const current = await this.readAppByPublicId(input.appId);
    if (!current || current.data.tenant_id !== input.tenantId) {
      return null;
    }
    const updated: AppRecord = {
      ...current.data,
      name: input.name,
      description: input.description ?? null,
      purchase_url: input.purchaseUrl ?? null,
      platform: input.platform,
      updated_at: nowIso()
    };
    try {
      await this.store.write(`app/${current.data.id}`, updated, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateApp(input);
      }
      throw error;
    }
    return await this.getAppByDbId(current.data.id);
  }

  async updateAppSecretHash(appId: string, tenantId: number, appSecretHash: string): Promise<AppRow | null> {
    const current = await this.readAppByPublicId(appId);
    if (!current || current.data.tenant_id !== tenantId) {
      return null;
    }
    try {
      await this.store.write(`app/${current.data.id}`, { ...current.data, app_secret_hash: appSecretHash, updated_at: nowIso() }, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateAppSecretHash(appId, tenantId, appSecretHash);
      }
      throw error;
    }
    return await this.getAppByDbId(current.data.id);
  }

  async deleteAppWithData(appDbId: number): Promise<boolean> {
    const app = await this.store.readData<AppRecord>(`app/${appDbId}`);
    if (!app) {
      return false;
    }
    const index = await this.store.readData<AppCodesIndex>(`appcodes/${appDbId}`);
    const entries = index?.entries ?? [];
    // 以记录为准判断是否仍有未删除的码（索引可能陈旧），顺手修复陈旧条目
    const pendingEntries: CodeIndexEntry[] = [];
    for (const entry of entries) {
      if (entry.status === CODE_STATUS.DELETED) {
        continue;
      }
      const record = await this.store.readData<CodeRecord>(`code/${entry.hash}`);
      if (!record) {
        continue;
      }
      if (record.status === CODE_STATUS.DELETED) {
        await this.syncCodeEntry(appDbId, record).catch(() => undefined);
        continue;
      }
      pendingEntries.push(entry);
    }
    if (pendingEntries.length > 0) {
      return false;
    }

    await this.removeAppLogs(appDbId, app.tenant_id);

    for (const entry of entries) {
      await this.store.deleteAll(`codeid/${entry.id}`).catch(() => undefined);
      await this.store.deleteAll(`code/${entry.hash}`).catch(() => undefined);
    }
    await this.store.deleteAll(`appcodes/${appDbId}`).catch(() => undefined);

    const batchIds = (await this.store.readData<{ ids: number[] }>(`appbatches/${appDbId}`))?.ids ?? [];
    for (const batchId of batchIds) {
      await this.store.deleteAll(`batch/${batchId}`).catch(() => undefined);
    }
    await this.store.deleteAll(`appbatches/${appDbId}`).catch(() => undefined);

    const versionIds = (await this.store.readData<{ ids: number[] }>(`appversions/${appDbId}`))?.ids ?? [];
    for (const versionId of versionIds) {
      await this.store.deleteAll(`version/${versionId}`).catch(() => undefined);
    }
    await this.store.deleteAll(`appversions/${appDbId}`).catch(() => undefined);

    await this.store.deleteAll(`appid/${app.app_id}`).catch(() => undefined);
    await this.store.deleteAll(`app/${appDbId}`).catch(() => undefined);
    await this.removeFromIndex(`tenantapps/${app.tenant_id}`, appDbId);
    return true;
  }

  async getAppByPublicId(appId: string, tenantId?: number): Promise<AppRow | null> {
    const app = await this.readAppByPublicId(appId);
    if (!app) {
      return null;
    }
    if (tenantId !== undefined && app.data.tenant_id !== tenantId) {
      return null;
    }
    return await this.joinAppRow(app.data);
  }

  // ---------- 批次与激活码 ----------

  async createBatch(input: {
    appDbId: number;
    planId: number;
    quantity: number;
    note?: string;
    createdBy: number;
  }): Promise<number> {
    const [batchId] = await this.ids.batches.allocate(1);
    const batch: BatchRecord = {
      id: batchId,
      app_id: input.appDbId,
      plan_id: input.planId,
      quantity: input.quantity,
      note: input.note ?? null,
      created_by: input.createdBy,
      created_at: nowIso()
    };
    await this.store.create(`batch/${batchId}`, batch);
    await this.appendToIndex(`appbatches/${input.appDbId}`, batchId);
    return batchId;
  }

  async createActivationCode(input: {
    batchId: number;
    appDbId: number;
    planId: number;
    codeHash: string;
    codeSuffix: string;
    createdBy: number;
  }): Promise<void> {
    await this.createActivationCodes([{ ...input, codePlaintextEncrypted: null }]);
  }

  async createActivationCodes(inputs: ActivationCodeInsertInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }
    const now = nowIso();
    const ids = await this.ids.codes.allocate(inputs.length);
    const records: CodeRecord[] = [];
    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index];
      const record: CodeRecord = {
        id: ids[index],
        batch_id: input.batchId,
        app_id: input.appDbId,
        plan_id: input.planId,
        code_hash: input.codeHash,
        code_suffix: input.codeSuffix,
        status: CODE_STATUS.UNUSED,
        disabled_at: null,
        activated_at: null,
        expires_at: null,
        device_hash: null,
        rebind_count: 0,
        last_rebind_at: null,
        created_by: input.createdBy,
        created_at: now,
        updated_at: now,
        issued_at: null,
        issued_to: null,
        code_plaintext_encrypted: input.codePlaintextEncrypted ?? null
      };
      // code_hash 全局唯一：create 冲突时抛 UNIQUE，与 D1 的 UNIQUE 约束行为一致
      await this.store.create(`code/${input.codeHash}`, record);
      await this.store.create(`codeid/${record.id}`, { hash: input.codeHash });
      records.push(record);
    }
    const byApp = new Map<number, CodeRecord[]>();
    for (const record of records) {
      const list = byApp.get(record.app_id) ?? [];
      list.push(record);
      byApp.set(record.app_id, list);
    }
    for (const [appDbId, appRecords] of byApp) {
      await this.store.mutate<AppCodesIndex>(
        `appcodes/${appDbId}`,
        (current) => ({
          entries: [...(current?.entries ?? []), ...appRecords.map(toCodeIndexEntry)]
        }),
        12
      );
    }
  }

  async findCodeByHash(codeHash: string): Promise<CodeDetailRow | null> {
    const record = await this.store.readData<CodeRecord>(`code/${codeHash}`);
    if (!record) {
      return null;
    }
    return await this.joinCodeDetail(record);
  }

  async claimNextCode(input: {
    appDbId: number;
    tenantId: number;
    planCode?: string;
  }): Promise<{
    codeId: number;
    codeHash: string;
    codeSuffix: string;
    planCode: string;
    planName: string;
    encrypted: string;
  } | null> {
    const app = await this.store.readData<AppRecord>(`app/${input.appDbId}`);
    if (!app || app.tenant_id !== input.tenantId) {
      return null;
    }
    let planId: number | undefined;
    if (input.planCode) {
      const plan = await this.getPlanByCode(input.planCode);
      if (!plan) {
        return null;
      }
      planId = plan.id;
    }
    const entries = (await this.store.readData<AppCodesIndex>(`appcodes/${input.appDbId}`))?.entries ?? [];
    const candidates = entries
      .filter((entry) => entry.status === CODE_STATUS.UNUSED && entry.has_plaintext && (planId === undefined || entry.plan_id === planId))
      .sort((a, b) => a.id - b.id);
    const now = nowIso();
    for (const candidate of candidates) {
      try {
        const { data: record } = await this.store.mutate<CodeRecord>(
          `code/${candidate.hash}`,
          (current) => {
            if (!current || current.status !== CODE_STATUS.UNUSED || !current.code_plaintext_encrypted) {
              throw new PreconditionFailedError("code no longer unused");
            }
            return { ...current, status: CODE_STATUS.ISSUED, issued_at: now, updated_at: now };
          }
        );
        await this.syncCodeEntry(input.appDbId, record).catch(() => undefined);
        const plan = await this.store.readData<PlanRow>(`plan/${record.plan_id}`);
        return {
          codeId: record.id,
          codeHash: record.code_hash,
          codeSuffix: record.code_suffix,
          planCode: plan?.code ?? input.planCode ?? "",
          planName: plan?.name ?? "",
          encrypted: record.code_plaintext_encrypted as string
        };
      } catch (error) {
        if (error instanceof PreconditionFailedError) {
          continue;
        }
        if (error instanceof CasConflictError) {
          return null;
        }
        throw error;
      }
    }
    return null;
  }

  async activateCode(input: {
    codeId: number;
    deviceHash: string;
    activatedAt: string;
    expiresAt: string;
  }): Promise<boolean> {
    const hash = await this.codeHashById(input.codeId);
    if (!hash) {
      return false;
    }
    try {
      const { data: record } = await this.mutateExisting<CodeRecord>(`code/${hash}`, (code) => {
        if (
          (code.status !== CODE_STATUS.UNUSED && code.status !== CODE_STATUS.ISSUED) ||
          code.disabled_at !== null ||
          code.activated_at !== null ||
          code.expires_at !== null ||
          code.device_hash !== null
        ) {
          throw new PreconditionFailedError("code not activatable");
        }
        return {
          ...code,
          status: CODE_STATUS.ACTIVE,
          activated_at: input.activatedAt,
          expires_at: input.expiresAt,
          device_hash: input.deviceHash,
          updated_at: input.activatedAt
        };
      });
      await this.syncCodeEntry(record.app_id, record).catch(() => undefined);
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return false;
      }
      throw error;
    }
  }

  async bindUnboundDevice(input: { codeId: number; deviceHash: string; boundAt: string }): Promise<boolean> {
    const result = await this.mutateCodeByHash(await this.codeHashById(input.codeId), (code) => {
      if (code.status !== CODE_STATUS.ACTIVE || code.disabled_at !== null || code.device_hash !== null) {
        throw new PreconditionFailedError("code not bindable");
      }
      return { ...code, device_hash: input.deviceHash, updated_at: input.boundAt };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => undefined);
    }
    return result !== null;
  }

  async unbindDevice(input: { codeId: number; deviceHash: string; unboundAt: string; maxRebinds: number }): Promise<boolean> {
    const result = await this.mutateCodeByHash(await this.codeHashById(input.codeId), (code) => {
      if (
        code.status !== CODE_STATUS.ACTIVE ||
        code.disabled_at !== null ||
        code.device_hash !== input.deviceHash ||
        code.rebind_count >= input.maxRebinds
      ) {
        throw new PreconditionFailedError("code not unbindable");
      }
      return {
        ...code,
        device_hash: null,
        rebind_count: code.rebind_count + 1,
        last_rebind_at: input.unboundAt,
        updated_at: input.unboundAt
      };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => undefined);
    }
    return result !== null;
  }

  async manuallyUnbindDevice(input: { codeId: number; tenantId: number; changedAt: string }): Promise<boolean> {
    const hash = await this.codeHashById(input.codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData<CodeRecord>(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app = await this.store.readData<AppRecord>(`app/${record.app_id}`);
    if (!app || app.tenant_id !== input.tenantId) {
      return false;
    }
    const result = await this.mutateCodeByHash(hash, (code) => {
      if (
        code.status !== CODE_STATUS.ACTIVE ||
        code.disabled_at !== null ||
        code.device_hash === null ||
        (code.expires_at !== null && code.expires_at <= input.changedAt)
      ) {
        throw new PreconditionFailedError("code not manually unbindable");
      }
      return { ...code, device_hash: null, updated_at: input.changedAt };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => undefined);
    }
    return result !== null;
  }

  async softDeleteCode(codeId: number, tenantId: number): Promise<boolean> {
    const hash = await this.codeHashById(codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData<CodeRecord>(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app = await this.store.readData<AppRecord>(`app/${record.app_id}`);
    if (!app || app.tenant_id !== tenantId) {
      return false;
    }
    const result = await this.mutateCodeByHash(hash, (code) => ({
      ...code,
      status: CODE_STATUS.DELETED,
      updated_at: nowIso()
    }));
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => undefined);
    }
    return result !== null;
  }

  async getCodeById(codeId: number, tenantId: number): Promise<CodeDetailRow | null> {
    const detail = await this.readCodeDetailById(codeId);
    if (!detail) {
      return null;
    }
    const app = await this.store.readData<AppRecord>(`app/${detail.app_id}`);
    if (!app || app.tenant_id !== tenantId) {
      return null;
    }
    return detail;
  }

  async hardDeleteCode(codeId: number, tenantId: number): Promise<boolean> {
    const hash = await this.codeHashById(codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData<CodeRecord>(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app = await this.store.readData<AppRecord>(`app/${record.app_id}`);
    if (!app || app.tenant_id !== tenantId) {
      return false;
    }
    await this.detachCodeFromLogs(codeId, app.tenant_id);
    await this.removeFromIndexEntry(record.app_id, codeId);
    await this.store.deleteAll(`codeid/${codeId}`).catch(() => undefined);
    await this.store.deleteAll(`code/${hash}`).catch(() => undefined);
    return true;
  }

  async updateCodeDisabled(input: { codeId: number; tenantId: number; disabled: boolean; changedAt: string }): Promise<boolean> {
    const hash = await this.codeHashById(input.codeId);
    if (!hash) {
      return false;
    }
    const record = await this.store.readData<CodeRecord>(`code/${hash}`);
    if (!record) {
      return false;
    }
    const app = await this.store.readData<AppRecord>(`app/${record.app_id}`);
    if (!app || app.tenant_id !== input.tenantId) {
      return false;
    }
    const result = await this.mutateCodeByHash(hash, (code) => {
      if (code.status === CODE_STATUS.DELETED) {
        throw new PreconditionFailedError("code deleted");
      }
      return {
        ...code,
        disabled_at: input.disabled ? input.changedAt : null,
        updated_at: input.changedAt
      };
    });
    if (result) {
      await this.syncCodeEntry(result.data.app_id, result.data).catch(() => undefined);
    }
    return result !== null;
  }

  async listCodes(filters: CodeListFilters): Promise<{ items: CodeListItem[]; total: number }> {
    const { appRows, entriesByApp } = await this.loadTenantCodeIndex(filters.tenantId);
    const appsById = new Map(appRows.map((app) => [app.id, app]));
    const plans = await this.getPlans();
    const plansById = new Map(plans.map((plan) => [plan.id, plan]));
    const filterPlanId = filters.planCode ? plans.find((plan) => plan.code === filters.planCode)?.id : undefined;
    const filtered: Array<{ entry: CodeIndexEntry; app: AppRecord }> = [];
    for (const [appDbId, entries] of entriesByApp) {
      const app = appsById.get(appDbId);
      if (!app) {
        continue;
      }
      if (filters.appId && app.app_id !== filters.appId) {
        continue;
      }
      for (const entry of entries) {
        if (filters.planCode && entry.plan_id !== filterPlanId) {
          continue;
        }
        if (!matchesCodeFilters(entry, app, filters)) {
          continue;
        }
        filtered.push({ entry, app });
      }
    }
    filtered.sort((a, b) => b.entry.created_at.localeCompare(a.entry.created_at) || b.entry.id - a.entry.id);

    const offset = (filters.page - 1) * filters.pageSize;
    const pageEntries = filtered.slice(offset, offset + filters.pageSize);
    // 逐行串行读 Blob 会让列表耗时随 page_size 线性增长（EdgeOne 上 100 条/页会撞上平台函数超时），
    // 因此改为有并发上限的并行读取；同一批次的码共享一条 batch 文档，去重后只读一次。
    const records = await mapWithConcurrency(pageEntries, CODE_PAGE_READ_CONCURRENCY, async ({ entry }) =>
      await this.store.readData<CodeRecord>(`code/${entry.hash}`)
    );
    const batchIds = new Set<number>();
    for (const record of records) {
      if (record && record.batch_id !== null) {
        batchIds.add(record.batch_id);
      }
    }
    const batches = new Map<number, BatchRecord>();
    await Promise.all(
      [...batchIds].map(async (batchId) => {
        const batch = await this.store.readData<BatchRecord>(`batch/${batchId}`);
        if (batch) {
          batches.set(batchId, batch);
        }
      })
    );

    const items: CodeListItem[] = [];
    const heals: Array<Promise<void>> = [];
    for (let index = 0; index < pageEntries.length; index += 1) {
      const { entry, app } = pageEntries[index];
      const record = records[index];
      if (!record) {
        continue;
      }
      heals.push(this.healCodeEntry(app.id, entry, record));
      const batch = record.batch_id === null ? null : batches.get(record.batch_id) ?? null;
      items.push(toCodeListItem(record, app, plansById.get(record.plan_id) ?? null, batch));
    }
    if (heals.length > 0) {
      await Promise.all(heals);
    }
    return { items, total: filtered.length };
  }

  // ---------- 日志 ----------

  async listLogs(filters: LogListFilters): Promise<{ items: LogListItem[]; total: number }> {
    const dailyStats = await this.loadDailyLogStats(filters.tenantId);
    const hourBases = (await this.store.listBases(`logshard/${filters.tenantId}`))
      .map((base) => base.split("/").pop() ?? "")
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    const isFiltered = Boolean(filters.query || filters.appId || filters.action);
    const collected: LogEntry[] = [];
    let scanned = 0;
    for (const hour of hourBases) {
      if (scanned >= MAX_LOG_SHARD_SCAN) {
        break;
      }
      const shard = await this.store.readData<{ items: LogEntry[] }>(`logshard/${filters.tenantId}/${hour}`);
      scanned += 1;
      if (!shard) {
        continue;
      }
      if (!isFiltered && collected.length >= filters.page * filters.pageSize) {
        break;
      }
      for (const entry of shard.items) {
        if (matchesLogFilters(entry, filters)) {
          collected.push(entry);
        }
      }
    }
    collected.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const total = isFiltered ? collected.length : dailyStats.total;
    const offset = (filters.page - 1) * filters.pageSize;
    const items = collected.slice(offset, offset + filters.pageSize).map(toLogListItem);
    return { items, total };
  }

  async insertLog(input: {
    codeId?: number;
    appDbId?: number;
    action: LogAction;
    result: LogResult;
    deviceHash?: string;
    errorCode?: string;
    message?: string;
  }): Promise<void> {
    let app: AppRecord | null = null;
    if (input.appDbId !== undefined) {
      app = await this.store.readData<AppRecord>(`app/${input.appDbId}`);
    }
    let codeSuffix: string | null = null;
    if (!app && input.codeId !== undefined) {
      const hash = await this.codeHashById(input.codeId);
      const code = hash ? await this.store.readData<CodeRecord>(`code/${hash}`) : null;
      if (code) {
        codeSuffix = code.code_suffix;
        app = await this.store.readData<AppRecord>(`app/${code.app_id}`);
      }
    } else if (input.codeId !== undefined) {
      const hash = await this.codeHashById(input.codeId);
      const code = hash ? await this.store.readData<CodeRecord>(`code/${hash}`) : null;
      codeSuffix = code?.code_suffix ?? null;
    }
    if (!app) {
      // 归属应用已被删除等极端场景：放弃这条审计日志，不影响主流程
      return;
    }
    const created = nowIso();
    const entry: LogEntry = {
      id: await this.ids.logs.allocateOne(),
      app_db_id: app.id,
      code_db_id: input.codeId ?? null,
      action: input.action,
      result: input.result,
      device_hash: input.deviceHash ?? null,
      error_code: input.errorCode ?? null,
      message: input.message ?? null,
      created_at: created,
      code_suffix: codeSuffix,
      app_id: app.app_id,
      app_name: app.name
    };
    const hourKey = toHourKey(created);
    await this.store.mutate<{ items: LogEntry[] }>(
      `logshard/${app.tenant_id}/${hourKey}`,
      (current) => ({ items: [...(current?.items ?? []), entry] }),
      12
    );
    const dayKey = created.slice(0, 10);
    const clientFailure = input.result === LOG_RESULT.FAILURE && CLIENT_LOG_ACTIONS.has(input.action) ? 1 : 0;
    await this.store.mutate<DailyLogStats>(`logday/${app.tenant_id}/${dayKey}`, (current) => ({
      total: (current?.total ?? 0) + 1,
      success: (current?.success ?? 0) + (input.result === LOG_RESULT.SUCCESS ? 1 : 0),
      client_failures: (current?.client_failures ?? 0) + clientFailure
    }));
  }

  // ---------- 版本管理 ----------

  async listVersions(filters: VersionListFilters): Promise<{ items: VersionListItem[]; total: number }> {
    const appRows = await this.listTenantApps(filters.tenantId);
    const appsByDbId = new Map(appRows.map((app) => [app.id, app]));
    const targetApps = filters.appId ? appRows.filter((app) => app.app_id === filters.appId) : appRows;
    const collected: VersionRow[] = [];
    for (const app of targetApps) {
      const ids = (await this.store.readData<{ ids: number[] }>(`appversions/${app.id}`))?.ids ?? [];
      const versions = await Promise.all(ids.map((id) => this.store.readData<VersionRow>(`version/${id}`)));
      for (const version of versions) {
        if (
          version &&
          !version.deleted_at &&
          (!filters.status || version.status === filters.status) &&
          (!filters.version || version.version.includes(filters.version))
        ) {
          collected.push(version);
        }
      }
    }
    collected.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const offset = (filters.page - 1) * filters.pageSize;
    const items = collected.slice(offset, offset + filters.pageSize).map((version) => {
      const app = appsByDbId.get(version.app_id);
      return {
        ...version,
        app_public_id: app?.app_id ?? "",
        app_name: app?.name ?? "",
        tenant_id: app?.tenant_id ?? filters.tenantId
      } satisfies VersionListItem;
    });
    return { items, total: collected.length };
  }

  async getVersionById(versionId: number): Promise<VersionRow | null> {
    const version = await this.store.readData<VersionRow>(`version/${versionId}`);
    return version && !version.deleted_at ? version : null;
  }

  async getVersionWithTenant(versionId: number): Promise<(VersionRow & { tenant_id: number }) | null> {
    const version = await this.getVersionById(versionId);
    if (!version) {
      return null;
    }
    const app = await this.store.readData<AppRecord>(`app/${version.app_id}`);
    if (!app) {
      return null;
    }
    return { ...version, tenant_id: app.tenant_id };
  }

  async getVersionByAppAndCode(appDbId: number, versionCode: number): Promise<VersionRow | null> {
    const ids = (await this.store.readData<{ ids: number[] }>(`appversions/${appDbId}`))?.ids ?? [];
    const versions = await Promise.all(ids.map((id) => this.store.readData<VersionRow>(`version/${id}`)));
    return versions.find((version) => version && !version.deleted_at && version.version_code === versionCode) ?? null;
  }

  async createVersion(input: CreateVersionInput): Promise<VersionRow> {
    const now = nowIso();
    const [versionId] = await this.ids.versions.allocate(1);
    const version: VersionRow = {
      id: versionId,
      app_id: input.appDbId,
      version: input.version,
      version_code: input.versionCode,
      release_notes: input.releaseNotes,
      download_url: input.downloadUrl ?? "",
      is_forced: input.isForced ? 1 : 0,
      status: "draft",
      published_at: null,
      created_by: input.createdBy,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    await this.store.create(`version/${versionId}`, version);
    await this.appendToIndex(`appversions/${input.appDbId}`, versionId);
    return version;
  }

  async updateVersion(input: UpdateVersionInput): Promise<VersionRow | null> {
    const current = await this.store.read<VersionRow>(`version/${input.versionId}`);
    if (!current || current.data.deleted_at) {
      return null;
    }
    const updated: VersionRow = {
      ...current.data,
      version: input.version,
      version_code: input.versionCode,
      release_notes: input.releaseNotes,
      download_url: input.downloadUrl ?? "",
      is_forced: input.isForced ? 1 : 0,
      updated_at: nowIso()
    };
    try {
      await this.store.write(`version/${input.versionId}`, updated, current.v);
    } catch (error) {
      if (error instanceof CasConflictError) {
        return await this.updateVersion(input);
      }
      throw error;
    }
    return updated;
  }

  async publishVersion(versionId: number, publishedAt: string): Promise<boolean> {
    try {
      await this.mutateExisting<VersionRow>(`version/${versionId}`, (version) => {
        if (version.deleted_at || version.status !== "draft") {
          throw new PreconditionFailedError("version not publishable");
        }
        return { ...version, status: "published", published_at: publishedAt, updated_at: nowIso() };
      });
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return false;
      }
      throw error;
    }
  }

  async unpublishVersion(versionId: number): Promise<boolean> {
    try {
      await this.mutateExisting<VersionRow>(`version/${versionId}`, (version) => {
        if (version.deleted_at || version.status !== "published") {
          throw new PreconditionFailedError("version not unpublishable");
        }
        return { ...version, status: "draft", published_at: null, updated_at: nowIso() };
      });
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return false;
      }
      throw error;
    }
  }

  async softDeleteVersion(versionId: number): Promise<boolean> {
    try {
      await this.mutateExisting<VersionRow>(`version/${versionId}`, (version) => {
        if (version.deleted_at) {
          throw new PreconditionFailedError("version already deleted");
        }
        return { ...version, deleted_at: nowIso(), updated_at: nowIso() };
      });
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return false;
      }
      throw error;
    }
  }

  async getLatestPublishedVersion(appDbId: number): Promise<VersionRow | null> {
    const ids = (await this.store.readData<{ ids: number[] }>(`appversions/${appDbId}`))?.ids ?? [];
    const versions = await Promise.all(ids.map((id) => this.store.readData<VersionRow>(`version/${id}`)));
    const published = versions.filter(
      (version): version is VersionRow => version !== null && !version.deleted_at && version.status === "published"
    );
    if (published.length === 0) {
      return null;
    }
    return published.reduce((latest, version) => (version.version_code > latest.version_code ? version : latest));
  }

  // ---------- 仪表盘 ----------

  async getDashboardStats(tenantId: number): Promise<DashboardStats> {
    const now = new Date().toISOString();
    const trendDates = buildLastSevenDates();
    const { appRows, entriesByApp } = await this.loadTenantCodeIndex(tenantId);

    const overview = {
      apps_total: appRows.length,
      apps_active: appRows.filter((app) => app.status === APP_STATUS.ACTIVE).length,
      codes_total: 0,
      codes_unused: 0,
      codes_active: 0,
      codes_disabled: 0,
      codes_expired: 0,
      codes_deleted: 0,
      logs_today: 0,
      client_failures_today: 0
    };
    const ranking = appRows.map((app) => ({
      app_id: app.app_id,
      app_name: app.name,
      platform: app.platform,
      total: 0,
      active: 0,
      unused: 0,
      disabled: 0,
      expired: 0,
      deleted: 0
    }));
    const rankingByAppId = new Map(ranking.map((row) => [row.app_id, row]));
    const countByPlan = new Map<number, number>();
    const activatedByDate = new Map<string, number>();
    const expiredByDate = new Map<string, number>();
    const activeByDate = new Map<string, number>(trendDates.map((date) => [date, 0]));

    for (const [appDbId, entries] of entriesByApp) {
      const app = appRows.find((row) => row.id === appDbId);
      const rankingRow = app ? rankingByAppId.get(app.app_id) : undefined;
      for (const entry of entries) {
        overview.codes_total += 1;
        countByPlan.set(entry.plan_id, (countByPlan.get(entry.plan_id) ?? 0) + 1);
        if (rankingRow) {
          rankingRow.total += 1;
        }
        if (entry.status === CODE_STATUS.UNUSED && !entry.disabled) {
          overview.codes_unused += 1;
          if (rankingRow) {
            rankingRow.unused += 1;
          }
        } else if (entry.status === CODE_STATUS.ACTIVE && !entry.disabled) {
          const expired = entry.expires_at !== null && entry.expires_at <= now;
          if (expired) {
            overview.codes_expired += 1;
            if (rankingRow) {
              rankingRow.expired += 1;
            }
          } else {
            overview.codes_active += 1;
            if (rankingRow) {
              rankingRow.active += 1;
            }
          }
        } else if (entry.status !== CODE_STATUS.DELETED && entry.disabled) {
          overview.codes_disabled += 1;
          if (rankingRow) {
            rankingRow.disabled += 1;
          }
        }
        if (entry.status === CODE_STATUS.DELETED) {
          overview.codes_deleted += 1;
          if (rankingRow) {
            rankingRow.deleted += 1;
          }
        }
        if (entry.activated_at && entry.status !== CODE_STATUS.DELETED) {
          const date = entry.activated_at.slice(0, 10);
          activatedByDate.set(date, (activatedByDate.get(date) ?? 0) + 1);
        }
        if (entry.status === CODE_STATUS.ACTIVE && !entry.disabled && entry.expires_at) {
          const date = entry.expires_at.slice(0, 10);
          expiredByDate.set(date, (expiredByDate.get(date) ?? 0) + 1);
        }
        for (const date of trendDates) {
          const nextDate = nextUtcDate(date);
          if (
            entry.status === CODE_STATUS.ACTIVE &&
            !entry.disabled &&
            entry.activated_at !== null &&
            entry.activated_at < nextDate &&
            (entry.expires_at === null || entry.expires_at >= nextDate)
          ) {
            activeByDate.set(date, (activeByDate.get(date) ?? 0) + 1);
          }
        }
      }
    }

    const today = now.slice(0, 10);
    const dailyStats = await this.loadDailyLogStats(tenantId);
    const todayStats = dailyStats.byDate.get(today) ?? { total: 0, success: 0, client_failures: 0 };
    overview.logs_today = todayStats.total;
    overview.client_failures_today = todayStats.client_failures;

    const plans = await this.getPlans();
    const planDistribution = plans
      .map((plan) => ({
        plan_code: plan.code,
        plan_name: plan.name,
        count: countByPlan.get(plan.id) ?? 0
      }))
      .sort((a, b) => b.count - a.count);

    return {
      overview,
      code_status: [
        { status: CODE_STATUS.UNUSED, count: overview.codes_unused },
        { status: CODE_STATUS.ACTIVE, count: overview.codes_active },
        { status: CODE_DERIVED_STATUS.DISABLED, count: overview.codes_disabled },
        { status: CODE_DERIVED_STATUS.EXPIRED, count: overview.codes_expired },
        { status: CODE_STATUS.DELETED, count: overview.codes_deleted }
      ],
      app_code_ranking: ranking.sort((a, b) => b.total - a.total).slice(0, 8),
      plan_distribution: planDistribution,
      log_trend: trendDates.map((date) => {
        const stats = dailyStats.byDate.get(date);
        return {
          date,
          success: stats?.success ?? 0,
          failure: stats ? stats.total - stats.success : 0
        };
      }),
      code_trend: trendDates.map((date) => ({
        date,
        activated: activatedByDate.get(date) ?? 0,
        expired: expiredByDate.get(date) ?? 0,
        active: activeByDate.get(date) ?? 0
      }))
    };
  }

  // ---------- 管理员 ----------

  async getAdminByUsername(username: string): Promise<AdminJoined | null> {
    const pointer = await this.store.readData<{ id: number }>(`adminname/${username}`);
    if (!pointer) {
      return null;
    }
    return await this.readJoinedAdmin(pointer.id);
  }

  async getAdminByTenantAndUsername(tenant: string, username: string): Promise<AdminJoined | null> {
    const pointer = await this.store.readData<{ id: number }>(`adminname/${username}`);
    if (!pointer) {
      return null;
    }
    const admin = await this.readJoinedAdmin(pointer.id);
    if (!admin || admin.tenant_id === null) {
      return null;
    }
    const tenantRow = await this.getTenantById(admin.tenant_id);
    if (!tenantRow) {
      return null;
    }
    const normalized = tenant.toLowerCase();
    if (tenantRow.name !== tenant && tenantRow.slug !== normalized) {
      return null;
    }
    return admin;
  }

  async getAdminById(id: number): Promise<AdminJoined | null> {
    return await this.readJoinedAdmin(id);
  }

  async getAdminCredentialsById(id: number): Promise<AdminJoined | null> {
    return await this.readJoinedAdmin(id);
  }

  async createAdmin(input: {
    username: string;
    passwordHash: string;
    passwordSalt: string;
    role: AdminUserRow["role"];
    tenantId?: number;
  }): Promise<void> {
    const now = nowIso();
    const [adminId] = await this.ids.admins.allocate(1);
    await this.store.create(`adminname/${input.username}`, { id: adminId });
    const admin: AdminRecord = {
      id: adminId,
      tenant_id: input.tenantId ?? null,
      role: input.role,
      username: input.username,
      password_hash: input.passwordHash,
      password_salt: input.passwordSalt,
      created_at: now,
      updated_at: now
    };
    try {
      await this.store.create(`admin/${adminId}`, admin);
    } catch (error) {
      await this.store.deleteAll(`adminname/${input.username}`).catch(() => undefined);
      throw error;
    }
    if (admin.tenant_id !== null && admin.role === ADMIN_ROLE.TENANT_ADMIN) {
      await this.appendToIndex(`tenantadmins/${admin.tenant_id}`, adminId);
    }
  }

  async listTenantAdmins(tenantId: number): Promise<Array<Pick<AdminUserRow, "id" | "username" | "created_at" | "updated_at">>> {
    const ids = (await this.store.readData<{ ids: number[] }>(`tenantadmins/${tenantId}`))?.ids ?? [];
    const admins = await Promise.all(ids.map((id) => this.store.readData<AdminRecord>(`admin/${id}`)));
    return admins
      .filter((admin): admin is AdminRecord => admin !== null)
      .map(({ id, username, created_at, updated_at }) => ({ id, username, created_at, updated_at }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async updateAdminPassword(input: { adminId: number; passwordHash: string; passwordSalt: string }): Promise<boolean> {
    try {
      await this.mutateExisting<AdminRecord>(`admin/${input.adminId}`, (admin) => ({
        ...admin,
        password_hash: input.passwordHash,
        password_salt: input.passwordSalt,
        updated_at: nowIso()
      }));
      return true;
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return false;
      }
      throw error;
    }
  }

  // ---------- 内部工具 ----------

  private async mutateExisting<T>(base: string, fn: (current: T) => T): Promise<Versioned<T>> {
    return await this.store.mutate<T>(base, (current) => {
      if (!current) {
        throw new PreconditionFailedError(`${base} missing`);
      }
      return fn(current);
    });
  }

  private async codeHashById(codeId: number): Promise<string | null> {
    const pointer = await this.store.readData<{ hash: string }>(`codeid/${codeId}`);
    return pointer?.hash ?? null;
  }

  private async mutateCodeByHash(hash: string | null, fn: (code: CodeRecord) => CodeRecord): Promise<Versioned<CodeRecord> | null> {
    if (!hash) {
      return null;
    }
    try {
      return await this.mutateExisting<CodeRecord>(`code/${hash}`, fn);
    } catch (error) {
      if (error instanceof PreconditionFailedError) {
        return null;
      }
      throw error;
    }
  }

  private async readAppByPublicId(appId: string) {
    const pointer = await this.store.readData<{ id: number }>(`appid/${appId}`);
    if (!pointer) {
      return null;
    }
    return await this.store.read<AppRecord>(`app/${pointer.id}`);
  }

  private async getAppByDbId(dbId: number): Promise<AppRow | null> {
    const app = await this.store.readData<AppRecord>(`app/${dbId}`);
    if (!app) {
      return null;
    }
    return await this.joinAppRow(app);
  }

  private async joinAppRow(app: AppRecord): Promise<AppRow | null> {
    const tenant = await this.getTenantById(app.tenant_id);
    if (!tenant) {
      return null;
    }
    return { ...app, tenant_status: tenant.status };
  }

  private async listTenantApps(tenantId: number): Promise<AppRecord[]> {
    const ids = (await this.store.readData<{ ids: number[] }>(`tenantapps/${tenantId}`))?.ids ?? [];
    const apps = await Promise.all(ids.map((id) => this.store.readData<AppRecord>(`app/${id}`)));
    return apps.filter((app): app is AppRecord => app !== null);
  }

  private async readJoinedAdmin(id: number): Promise<AdminJoined | null> {
    const admin = await this.store.readData<AdminRecord>(`admin/${id}`);
    if (!admin) {
      return null;
    }
    const tenant = admin.tenant_id !== null ? await this.getTenantById(admin.tenant_id) : null;
    return {
      ...admin,
      tenant_name: tenant?.name ?? null,
      tenant_status: tenant?.status ?? null
    };
  }

  private async joinCodeDetail(record: CodeRecord | null): Promise<CodeDetailRow | null> {
    if (!record) {
      return null;
    }
    const app = await this.store.readData<AppRecord>(`app/${record.app_id}`);
    const plan = await this.store.readData<PlanRow>(`plan/${record.plan_id}`);
    if (!app || !plan) {
      return null;
    }
    return {
      ...record,
      app_public_id: app.app_id,
      app_name: app.name,
      app_platform: app.platform,
      app_status: app.status,
      plan_code: plan.code,
      plan_name: plan.name,
      duration_days: plan.duration_days
    };
  }

  private async readCodeDetailById(codeId: number): Promise<CodeDetailRow | null> {
    const hash = await this.codeHashById(codeId);
    if (!hash) {
      return null;
    }
    return await this.joinCodeDetail(await this.store.readData<CodeRecord>(`code/${hash}`));
  }

  private async appendToIndex(base: string, id: number): Promise<void> {
    await this.store.mutate<{ ids: number[] }>(base, (current) => ({ ids: [...(current?.ids ?? []), id] }), 12);
  }

  private async removeFromIndex(base: string, id: number): Promise<void> {
    await this.store.mutate<{ ids: number[] }>(base, (current) => ({ ids: (current?.ids ?? []).filter((item) => item !== id) }), 12);
  }

  private async removeFromIndexEntry(appDbId: number, codeId: number): Promise<void> {
    await this.store.mutate<AppCodesIndex>(`appcodes/${appDbId}`, (current) => ({
      entries: (current?.entries ?? []).filter((entry) => entry.id !== codeId)
    }));
  }

  private async syncCodeEntry(appDbId: number, record: CodeRecord): Promise<void> {
    const entry = toCodeIndexEntry(record);
    await this.store.mutate<AppCodesIndex>(`appcodes/${appDbId}`, (current) => {
      const entries = [...(current?.entries ?? [])];
      const index = entries.findIndex((item) => item.id === entry.id);
      if (index === -1) {
        entries.push(entry);
      } else {
        entries[index] = entry;
      }
      return { entries };
    }, 3);
  }

  /** 页面渲染时发现索引与记录不一致则顺手修复（读路径自愈） */
  private async healCodeEntry(appDbId: number, entry: CodeIndexEntry, record: CodeRecord): Promise<void> {
    if (entry.status === record.status && entry.disabled === (record.disabled_at !== null)) {
      return;
    }
    try {
      await this.syncCodeEntry(appDbId, record);
    } catch {
      // 自愈失败不影响本次响应
    }
  }

  private async loadTenantCodeIndex(tenantId: number): Promise<{
    appRows: AppRecord[];
    entriesByApp: Map<number, CodeIndexEntry[]>;
  }> {
    const appRows = await this.listTenantApps(tenantId);
    const entriesByApp = new Map<number, CodeIndexEntry[]>();
    await Promise.all(
      appRows.map(async (app) => {
        const index = await this.store.readData<AppCodesIndex>(`appcodes/${app.id}`);
        entriesByApp.set(app.id, index?.entries ?? []);
      })
    );
    return { appRows, entriesByApp };
  }

  private async loadDailyLogStats(tenantId: number): Promise<{ total: number; byDate: Map<string, DailyLogStats> }> {
    const dayBases = await this.store.listBases(`logday/${tenantId}`);
    const byDate = new Map<string, DailyLogStats>();
    let total = 0;
    const limited = dayBases.slice(-400);
    await Promise.all(
      limited.map(async (base) => {
        const day = base.split("/").pop() ?? "";
        const stats = await this.store.readData<DailyLogStats>(base);
        if (stats) {
          byDate.set(day, stats);
          total += stats.total;
        }
      })
    );
    return { total, byDate };
  }

  private async removeAppLogs(appDbId: number, tenantId: number): Promise<void> {
    const hourBases = await this.store.listBases(`logshard/${tenantId}`);
    const dailyDelta = new Map<string, { total: number; success: number; client_failures: number }>();
    for (const base of hourBases) {
      const shard = await this.store.read<{ items: LogEntry[] }>(base);
      if (!shard) {
        continue;
      }
      const removed = shard.data.items.filter((entry) => entry.app_db_id === appDbId);
      if (removed.length === 0) {
        continue;
      }
      const remaining = shard.data.items.filter((entry) => entry.app_db_id !== appDbId);
      await this.store.write(base, { items: remaining }, shard.v).catch(() => undefined);
      for (const entry of removed) {
        const day = entry.created_at.slice(0, 10);
        const delta = dailyDelta.get(day) ?? { total: 0, success: 0, client_failures: 0 };
        delta.total += 1;
        if (entry.result === LOG_RESULT.SUCCESS) {
          delta.success += 1;
        }
        if (entry.result === LOG_RESULT.FAILURE && CLIENT_LOG_ACTIONS.has(entry.action)) {
          delta.client_failures += 1;
        }
        dailyDelta.set(day, delta);
      }
    }
    for (const [day, delta] of dailyDelta) {
      await this.store
        .mutate<DailyLogStats>(`logday/${tenantId}/${day}`, (current) => ({
          total: Math.max(0, (current?.total ?? 0) - delta.total),
          success: Math.max(0, (current?.success ?? 0) - delta.success),
          client_failures: Math.max(0, (current?.client_failures ?? 0) - delta.client_failures)
        }))
        .catch(() => undefined);
    }
  }

  private async detachCodeFromLogs(codeId: number, tenantId: number): Promise<void> {
    const hourBases = await this.store.listBases(`logshard/${tenantId}`);
    for (const base of hourBases) {
      const shard = await this.store.read<{ items: LogEntry[] }>(base);
      if (!shard || !shard.data.items.some((entry) => entry.code_db_id === codeId)) {
        continue;
      }
      const items = shard.data.items.map((entry) =>
        entry.code_db_id === codeId ? { ...entry, code_db_id: null, code_suffix: null } : entry
      );
      await this.store.write(base, { items }, shard.v).catch(() => undefined);
    }
  }
}

// ---------- 纯函数工具 ----------

/** 有并发上限的并行 map，用于把 N 次独立 Blob 读从「串行 N×延迟」压缩到「并发批次」 */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function toCodeIndexEntry(record: CodeRecord): CodeIndexEntry {
  return {
    id: record.id,
    hash: record.code_hash,
    suffix: record.code_suffix,
    status: record.status,
    disabled: record.disabled_at !== null,
    activated_at: record.activated_at,
    expires_at: record.expires_at,
    plan_id: record.plan_id,
    created_at: record.created_at,
    has_plaintext: record.code_plaintext_encrypted !== null
  };
}

function matchesCodeFilters(entry: CodeIndexEntry, app: AppRecord, filters: CodeListFilters): boolean {
  if (filters.query) {
    const query = filters.query;
    if (!entry.suffix.includes(query) && !app.app_id.includes(query) && !app.name.includes(query)) {
      return false;
    }
  }
  const now = new Date().toISOString();
  switch (filters.status) {
    case undefined:
      return true;
    case CODE_DERIVED_STATUS.DISABLED:
      return entry.disabled && entry.status !== CODE_STATUS.DELETED;
    case CODE_DERIVED_STATUS.EXPIRED:
      return entry.status === CODE_STATUS.ACTIVE && !entry.disabled && entry.expires_at !== null && entry.expires_at <= now;
    case CODE_STATUS.UNUSED:
    case CODE_STATUS.ACTIVE:
      return entry.status === filters.status && !entry.disabled;
    default:
      return entry.status === filters.status;
  }
}

function toCodeListItem(record: CodeRecord, app: AppRecord, plan: PlanRow | null, batch: BatchRecord | null): CodeListItem {
  return {
    id: record.id,
    code_suffix: record.code_suffix,
    status: record.status,
    disabled_at: record.disabled_at,
    activated_at: record.activated_at,
    expires_at: record.expires_at,
    device_hash: record.device_hash,
    rebind_count: record.rebind_count,
    last_rebind_at: record.last_rebind_at,
    created_at: record.created_at,
    app_id: app.app_id,
    app_name: app.name,
    app_platform: app.platform,
    plan_code: plan?.code ?? "",
    plan_name: plan?.name ?? "",
    duration_days: plan?.duration_days ?? 0,
    batch_id: record.batch_id,
    batch_note: batch?.note ?? null
  };
}

function matchesLogFilters(entry: LogEntry, filters: LogListFilters): boolean {
  if (filters.query) {
    const query = filters.query;
    if (
      !(entry.code_suffix ?? "").includes(query) &&
      !(entry.error_code ?? "").includes(query) &&
      !(entry.message ?? "").includes(query)
    ) {
      return false;
    }
  }
  if (filters.appId && entry.app_id !== filters.appId) {
    return false;
  }
  if (filters.action && entry.action !== filters.action) {
    return false;
  }
  return true;
}

function toLogListItem(entry: LogEntry): LogListItem {
  return {
    id: entry.id,
    action: entry.action,
    result: entry.result,
    device_hash: entry.device_hash,
    error_code: entry.error_code,
    message: entry.message,
    created_at: entry.created_at,
    code_suffix: entry.code_suffix,
    app_id: entry.app_id,
    app_name: entry.app_name
  };
}

function toHourKey(iso: string): string {
  return iso.slice(0, 13).replace(/[-T]/g, "");
}

function startOfUtcDayOffset(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function buildLastSevenDates(): string[] {
  return Array.from({ length: 7 }, (_, index) => startOfUtcDayOffset(index - 6).slice(0, 10));
}

function nextUtcDate(date: string): string {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return nextDate.toISOString().slice(0, 10);
}
