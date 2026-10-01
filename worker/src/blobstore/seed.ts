import { DocStore, PreconditionFailedError } from "./docstore";
import { TENANT_STATUS } from "../constants";
import type { PlanRow, TenantRow } from "../types";

/**
 * EdgeOne Blob 部署没有 SQL 迁移：种子数据（套餐 + 默认租户）首次启动时幂等写入。
 * 取值与 migrations/0001、0004、0006 的 INSERT OR IGNORE 保持一致；
 * 修改套餐种子时必须同步这三份迁移（Cloudflare 路径）。
 * 计划 id 沿用 D1 自增顺序：weekly=1 monthly=2 quarterly=3 yearly=4 daily=5 lifetime=6 two_day=7 three_day=8。
 */
export const SEED_PLANS: Array<Omit<PlanRow, "created_at">> = [
  { id: 5, code: "daily", name: "天卡", duration_days: 1, sort_order: 5 },
  { id: 7, code: "two_day", name: "两天卡", duration_days: 2, sort_order: 6 },
  { id: 8, code: "three_day", name: "三天卡", duration_days: 3, sort_order: 7 },
  { id: 1, code: "weekly", name: "周卡", duration_days: 7, sort_order: 10 },
  { id: 2, code: "monthly", name: "月卡", duration_days: 30, sort_order: 20 },
  { id: 3, code: "quarterly", name: "季卡", duration_days: 90, sort_order: 30 },
  { id: 4, code: "yearly", name: "年卡", duration_days: 365, sort_order: 40 },
  { id: 6, code: "lifetime", name: "永久卡", duration_days: 26800, sort_order: 50 }
];

export const DEFAULT_TENANT_ID = 1;

const SEED_MARKER = "seed/meta";
const SEED_VERSION = 1;

const seedInFlight = new WeakMap<DocStore, Promise<void>>();

/** 每 isolate 每个 DocStore 只执行一次；全部写入幂等，并发冷启动安全 */
export function ensureSeeded(store: DocStore): Promise<void> {
  const cached = seedInFlight.get(store);
  if (cached) {
    return cached;
  }
  const promise = seedOnce(store).catch((error) => {
    seedInFlight.delete(store);
    throw error;
  });
  seedInFlight.set(store, promise);
  return promise;
}

async function seedOnce(store: DocStore): Promise<void> {
  // 快速通道：种子完整则跳过。不依赖 marker 单一证据，避免历史残留导致数据缺口
  const [marker, plansIndex, tenant] = await Promise.all([
    store.readData<{ version: number }>(SEED_MARKER),
    store.readData<{ ids: number[] }>("plans"),
    store.readData<TenantRow>(`tenant/${DEFAULT_TENANT_ID}`)
  ]);
  if (marker?.version === SEED_VERSION && plansIndex && tenant) {
    return;
  }
  const now = new Date().toISOString();

  for (const plan of SEED_PLANS) {
    const planRow: PlanRow = { ...plan, created_at: now };
    await store.createIfAbsent(`plan/${plan.id}`, planRow);
    await store.createIfAbsent(`plancode/${plan.code}`, { id: plan.id });
  }
  await store.createIfAbsent("plans", { ids: SEED_PLANS.map((plan) => plan.id) });

  const defaultTenant: TenantRow = {
    id: DEFAULT_TENANT_ID,
    name: "默认租户",
    slug: "default",
    status: TENANT_STATUS.ACTIVE,
    created_at: now,
    updated_at: now
  };
  await store.createIfAbsent(`tenant/${DEFAULT_TENANT_ID}`, defaultTenant);
  await store.createIfAbsent("tenantslug/default", { id: DEFAULT_TENANT_ID });
  await store.createIfAbsent("tenants", { ids: [DEFAULT_TENANT_ID] });

  // 种子占用了租户 id 1，发号器从 2 开始；其余实体从 1 开始
  await store.createIfAbsent("seq/tenants", { next: 2 });
  for (const entity of ["admins", "apps", "batches", "codes", "versions", "logs"]) {
    await store.createIfAbsent(`seq/${entity}`, { next: 1 });
  }

  await store.createIfAbsent(SEED_MARKER, { version: SEED_VERSION });
}

/** 供测试使用：断言种子标记存在 */
export async function assertSeeded(store: DocStore): Promise<void> {
  const marker = await store.readData<{ version: number }>(SEED_MARKER);
  if (!marker) {
    throw new PreconditionFailedError("seed marker missing");
  }
}
