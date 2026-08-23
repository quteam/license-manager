# 自定义改动说明：新增「天卡」与「永久卡」套餐

> 本文档记录对上游 [quteam/license-manager](https://github.com/quteam/license-manager) 的本地改动。
> 当拉取上游更新（`git pull`）覆盖了这些改动后，按本文档即可快速恢复。
> 改动日期：2026-08-23 ｜ 部署版本：`2df76ec0`

---

## 1. 功能说明

- **天卡（daily）**：激活后有效期 1 天。
- **永久卡（lifetime）**：激活后到期时间恒定为 **2099-12-31T23:59:59Z**（不随激活时间变化）。

已通过端到端验证：
- 天卡激活 → `expires_at = 激活时刻 + 1天`
- 永久卡激活 → `expires_at = 2099-12-31T23:59:59.000Z`

---

## 2. 改动文件清单（共 5 个文件）

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `migrations/0004_add_daily_lifetime_plans.sql` | 新增 | 向 plans 表插入 daily / lifetime 两条套餐 |
| `worker/src/service.ts` | 修改 | `calculateExpiresAt()` 增加 `lifetime` 特判，到期固定 2099-12-31 |
| `admin/src/shared/plan.ts` | 修改 | `formatPlanDuration()` 增加 `lifetime` 显示分支 |
| `admin/src/i18n/messages.ts` | 修改 | 中英文各加一条 `planDuration.lifetime` 文案 |
| `worker/test/service.test.ts` | 修改（可选） | mock 数据补 `purchase_url: null`（此前 purchase_url 改动遗留的类型修复，已随本改动保留） |

> 注：`worker/test/service.test.ts` 中 `purchase_url: null` 是早期为购买链接改动补的类型字段；由于 `CodeDetailRow` 类型已含 `purchase_url`（上游自带），该字段**必须保留**，否则类型检查报错。若上游更新后类型检查通过，可忽略此项。

---

## 3. 各文件改动详情（粘贴即用）

### 3.1 新增 `migrations/0004_add_daily_lifetime_plans.sql`

```sql
-- 新增天卡与永久卡套餐
INSERT OR IGNORE INTO plans (code, name, duration_days, sort_order) VALUES
  ('daily', '天卡', 1, 5),
  ('lifetime', '永久卡', 26800, 50);
```

### 3.2 `worker/src/service.ts` —— `calculateExpiresAt()`

在 `switch (code.plan_code)` 的 `case "monthly"` 之前插入：

```ts
      case "lifetime":
        return "2099-12-31T23:59:59.000Z";
```

改完后的完整函数：

```ts
  private calculateExpiresAt(activatedAt: string, code: CodeDetailRow): string {
    switch (code.plan_code) {
      case "lifetime":
        return "2099-12-31T23:59:59.000Z";
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
```

### 3.3 `admin/src/shared/plan.ts` —— `formatPlanDuration()`

在 `switch (code)` 的 `case "monthly"` 之前插入：

```ts
    case "lifetime":
      return t ? t("planDuration.lifetime") : "激活后长期有效";
```

### 3.4 `admin/src/i18n/messages.ts` —— 中文文案（`planDuration` 块内）

```ts
      lifetime: "激活后长期有效",
```

### 3.5 `admin/src/i18n/messages.ts` —— 英文文案（`planDuration` 块内，另一处）

```ts
      lifetime: "Valid forever after activation",
```

---

## 4. 恢复步骤（上游更新后）

```bash
# 1. 确认上游更新后上述文件被还原（git status 检查）
# 2. 重新应用所有改动（按第 3 节逐个粘贴，或从 git stash / 备份恢复）

# 3. 安装依赖（若需）
pnpm install

# 4. 类型检查 + 测试
pnpm type-check
pnpm --filter @license-manager/worker test

# 5. 应用数据库迁移（0004）
pnpm db:migrate:remote

# 6. 部署（分步构建，避免 rolldown 偶发失败）
pnpm --filter @license-manager/admin build
pnpm --filter @license-manager/worker build:production
pnpm --filter @license-manager/worker deploy
```

### 部署后验证

```bash
# 1. 确认套餐已入库（应有 6 条：daily/weekly/monthly/quarterly/yearly/lifetime）
curl -s https://kami.060908.xyz/api/admin/plans -H "Authorization: Bearer <token>"

# 2. 生成并激活一张永久卡，expires_at 应为 2099-12-31T23:59:59.000Z
```

---

## 5. 相关环境信息

| 项目 | 值 |
|---|---|
| 生产域名 | https://kami.060908.xyz |
| D1 数据库 | `license_manager`（id: `a65361e1-aefe-4b1c-a90a-9a1a19fcd7e9`） |
| 部署方式 | `worker/wrangler.production.toml`（私有，不提交） |
| 上游基线 | commit `43245ee`（增强演示环境安全，禁止修改公共演示账号密码） |

---

## 6. 其他同期改动（不属于本功能，注意区分）

- Cloudflare Zone `060908.xyz` 上的通配路由 `*060908.xyz/* → 404-page` 已删除（解决 kami.060908.xyz 请求被 404-page 抢占的问题）。此改动在 Cloudflare 控制台/API 层，不在代码仓库内，上游更新不会影响，无需重复处理。
- `pnpm-workspace.yaml` 含 `storeDir` 配置（本机 pnpm store 路径，避免沙箱删除报错），属本地环境配置。
