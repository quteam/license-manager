# 数据库规范

Cloudflare D1 是唯一持久化存储。Schema 只通过根目录 `migrations/` 演进；数据库现状等于按文件名顺序应用全部迁移后的结果，不能只看初始迁移或 TypeScript 类型推测。

## 当前迁移

| 迁移 | 作用 |
| --- | --- |
| `0001_initial.sql` | 创建应用、套餐、管理员、生成批次、激活码、日志、索引和内置套餐 |
| `0002_add_purchase_url.sql` | 为 `apps` 增加可选 `purchase_url` |

已发布迁移不可修改来表达线上变化。任何 schema 变化都新增下一序号迁移，并保证从空库和已有库都能按顺序执行。

## 关系模型

```text
apps ────────┬─< activation_batches >─ plans
             ├─< activation_codes  >── plans
             └─< activation_logs

admin_users ─┬─< activation_batches
             └─< activation_codes

activation_batches ─< activation_codes ─< activation_logs
```

- `apps`：应用元数据、启用状态、可选购买链接和应用密钥 HMAC。
- `plans`：套餐代码、名称、基础天数和排序。
- `admin_users`：管理员用户名、密码哈希和 salt。
- `activation_batches`：一次批量生成的应用、套餐、数量、备注和创建人。
- `activation_codes`：激活码 HMAC、后缀、生命周期、禁用、设备绑定和授权时间。
- `activation_logs`：客户端和管理员操作审计记录。

## 表级不变量

### `apps`

- `app_id` 全局唯一，是对外公开标识；内部关联使用自增 `id`。
- `status` 只能为 `active` 或 `disabled`。
- `app_secret_hash` 保存 HMAC，不保存明文密钥。
- `description` 和 `purchase_url` 可为空；`purchase_url` 的 `http`/`https` 校验在 HTTP 层完成。
- 只有没有 batch、code 和 log 引用的应用才能物理删除。

### `plans`

- `code` 全局唯一，`duration_days > 0`。
- 初始套餐为 `weekly`、`monthly`、`quarterly`、`yearly`。
- `duration_days` 是基础字段；自然月/年套餐的实际到期时间由 service 根据套餐 code 计算。
- 已使用套餐的 code 和语义不得原地改变；新增套餐优先新增数据和明确计算策略。

### `admin_users`

- `username` 全局唯一。
- 密码使用随机 salt 和哈希保存；密码更新必须同时替换 `password_hash` 和 `password_salt`。
- bootstrap 配置不直接写入表，只有初始化或恢复流程会创建/更新对应管理员。

### `activation_batches`

- 每个批次固定关联一个应用和一个套餐。
- `quantity > 0`，当前 API 进一步限制为最多 300。
- 批次记录不保存明文激活码。

### `activation_codes`

| 字段 | 不变量 |
| --- | --- |
| `code_hash` | 全局唯一 HMAC，不可用于恢复明文 |
| `code_suffix` | 只用于人工识别和模糊搜索，不是认证凭证 |
| `status` | 仅 `unused`、`active`、`deleted` |
| `disabled_at` | 非空表示管理禁用，不改变原 `status` |
| `activated_at` | 仅首次激活写入，之后不变 |
| `expires_at` | 仅首次激活计算，之后不变 |
| `device_hash` | 设备指纹 HMAC；解绑后可为空 |
| `rebind_count` | 仅自助解绑成功时递增，初始为 0 |
| `last_rebind_at` | 仅自助解绑成功时更新；手动解绑不更新 |

合法字段组合：

| 场景 | `status` | 激活/到期时间 | `device_hash` |
| --- | --- | --- | --- |
| 未激活 | `unused` | 均为空 | 空 |
| 正常使用 | `active` | 均非空 | 非空 |
| 已解绑待重绑 | `active` | 均非空 | 空 |
| 已删除 | `deleted` | 保留删除前值 | 保留删除前值或为空 |

软删除只把 `status` 更新为 `deleted`，不物理删除行，也不清除审计需要的历史字段。

### `activation_logs`

- `action`、`result` 和 `error_code` 使用稳定值；当前 schema 不做 CHECK，运行时常量是约束来源。
- 日志可以通过 `code_id` 关联激活码，也可以通过 `app_id` 保留直接应用上下文。
- `device_hash` 可以保存 HMAC；不得保存设备指纹、完整激活码、密钥或密码。
- `message` 面向人工阅读，统计和程序逻辑使用结构化字段，不解析 message。

## 派生状态

`disabled` 和 `expired` 不写入 `activation_codes.status`。统一判断顺序：

```sql
CASE
  WHEN status = 'deleted' THEN 'deleted'
  WHEN disabled_at IS NOT NULL THEN 'disabled'
  WHEN status = 'active' AND expires_at <= :now THEN 'expired'
  WHEN status = 'active' THEN 'active'
  ELSE 'unused'
END
```

需要折叠为单一主状态的 dashboard、趋势和前端展示必须沿用同一优先级。统计口径变化时，应同时检查列表筛选、总数查询、dashboard 聚合和前端状态标签。

当前激活码列表筛选中：

- `disabled` 排除已删除行。
- `expired` 只包含已激活、未禁用且到期的行。
- `unused` 和 `active` 按存储生命周期筛选并排除禁用行；调用方仍需根据 `expires_at` 区分有效 active 与 expired。
- `deleted` 直接按存储状态筛选。

## 原子更新

以下状态变化必须由 SQL `WHERE` 前置条件再次保护，不能只依赖 service 读取后的判断：

- 首次激活：仅 `unused`、未禁用且激活/到期/设备字段为空时更新。
- 重绑设备：仅 `active`、未禁用且 `device_hash IS NULL` 时更新。
- 自助解绑：仅 `active`、未禁用、设备匹配且 `rebind_count < max` 时更新。
- 手动解绑：仅 `active`、未禁用、未过期且已绑定时更新。
- 启用/禁用：排除 `deleted`。
- 删除应用：再次确认 batch、code 和 log 均无引用。

条件更新影响行数不为 1 时，repository 返回失败，service 根据场景返回 `NOT_FOUND` 或 `CONFLICT`，不得无条件覆盖并发状态。

## SQL 规范

- SQL 只放在 `worker/src/repository.ts` 或 migration 文件。
- 所有用户输入使用 D1 prepared statement 和 `.bind(...)`，不得字符串拼接。
- 动态筛选可以拼接固定 SQL 片段，但值必须进入 bindings。
- 时间字段统一保存 UTC ISO 字符串，并使用同一格式进行比较。
- 列表查询和 `COUNT(*)` 必须共享同一筛选条件，防止分页总数不一致。
- 批量写入可以构造固定数量占位符，但不得把输入值插入 SQL 文本。
- 不新增冗余统计表；dashboard 使用只读聚合查询，并复用派生状态口径。

## 索引要求

当前关键索引：

- `idx_apps_app_id`
- `idx_codes_app_plan_status`
- `idx_codes_suffix`
- `idx_codes_expires_at`
- `idx_codes_created_at`
- `idx_logs_code_created_at`
- `idx_logs_app_created_at`
- `idx_logs_created_at`

新增高频筛选或排序前先检查现有查询计划和索引前缀。修改列表排序时同步评估分页稳定性、总数查询和索引，不因单个页面需求盲目增加索引。

## 迁移流程

Schema 变化时按顺序完成：

1. 新增 `migrations/NNNN_description.sql`。
2. 更新 `worker/src/types.ts` 的数据库行类型。
3. 更新 `worker/src/repository.ts` 的 SELECT、INSERT、UPDATE 和映射。
4. 枚举变化同步 `worker/src/constants.ts` 和前端常量。
5. 响应变化同步 `admin/src/types.ts`、调用页面和 `docs/API.md`。
6. 更新 repository/service 测试和本文。
7. 运行本地迁移、Worker 类型检查和测试。

```bash
pnpm db:migrate:local
pnpm --filter @license-manager/worker type-check
pnpm --filter @license-manager/worker test
```

远程迁移属于部署步骤，只按 [部署指南](DEPLOYMENT.md) 在确认生产配置和备份策略后执行：

```bash
pnpm db:migrate:remote
```
