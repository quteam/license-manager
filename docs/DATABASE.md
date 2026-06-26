# 数据库规范

D1 schema 由 `migrations/` 管理，当前初始迁移为 `migrations/0001_initial.sql`。

## 表职责

- `apps`：应用元数据、可选描述和应用密钥哈希。
- `plans`：套餐定义。
- `admin_users`：管理员账号和密码哈希。
- `activation_batches`：批量生成记录。
- `activation_codes`：激活码状态、禁用时间、设备绑定和过期时间。
- `activation_logs`：激活、校验、解绑、手动解绑和管理操作日志。

## 核心约束

- 激活码唯一性由 `activation_codes.code_hash` 保证。
- 激活码搜索只能依赖 `code_suffix`、应用 ID 或应用名称。
- `activation_codes.status` 只能为 `unused`、`active`、`deleted`。
- 业务上的“已过期”不是独立存储状态，而是由 `status = active` 且 `expires_at <= now` 计算得出。
- 业务上的“已禁用”不是独立 `status`，而是由 `disabled_at IS NOT NULL` 计算得出。
- 自助解绑迁移期间激活码仍保持 `status = active`，以 `device_hash IS NULL` 表示暂未绑定设备，`activated_at` 和 `expires_at` 不重算。
- 删除操作必须使用软删除，不得物理删除激活码。
- 外键关系应保持启用，迁移中使用 `PRAGMA foreign_keys = ON`。

## 内置套餐

初始迁移内置四类套餐：

- `weekly`：周卡，7 天。
- `monthly`：月卡，激活时按 1 个自然月计算到期时间。
- `quarterly`：季卡，激活时按 3 个自然月计算到期时间。
- `yearly`：年卡，激活时按 1 个自然年计算到期时间。

`duration_days` 保留为套餐基础时长字段和周卡等按天套餐的计算依据；月卡、季卡和年卡的实际到期时间以业务层自然月/自然年计算为准。修改套餐含义会影响已有业务理解，新增套餐优先追加数据，不要随意改变已使用 code 的语义。

## 迁移规则

- 修改已发布 schema 时应新增迁移文件。
- 不要通过修改旧迁移表达线上变更。
- 涉及字段变更时同步更新 `worker/src/types.ts`，枚举值变化同步更新 `worker/src/constants.ts`。
- 涉及查询结果变更时同步更新 `worker/src/repository.ts` 和 `admin/src/types.ts`。
- 涉及前端展示字段时同步更新 `admin/src/types.ts`、`admin/src/shared/constants.ts` 和相关 `admin/src/pages/` 页面。

数据库迁移变更后本地验证：

```bash
pnpm db:migrate:local
```

远程迁移：

```bash
pnpm db:migrate:remote
```

## SQL 规范

- SQL 访问只放在 `worker/src/repository.ts`。
- 使用 D1 prepared statement 和 `.bind(...)`。
- 不得拼接用户输入。
- 时间字段统一保存 ISO 字符串。
- 复杂筛选需要同时考虑总数查询和列表查询。
- 激活码和日志列表按创建时间倒序分页，需保留 `idx_codes_created_at` 和 `idx_logs_created_at` 排序索引。
- 面板首页统计通过只读聚合查询生成，不新增冗余统计表；激活、禁用、过期、删除等数量需要沿用激活码派生状态口径，激活码走势基于 `activated_at`、`expires_at` 和当天结束时仍有效的状态计算。
