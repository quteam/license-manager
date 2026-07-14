# 开发指南

## 环境要求

- Node.js `>=20.11.0`
- pnpm `>=11.7.0`
- Cloudflare Wrangler，由 `worker/package.json` 管理

安装依赖：

```bash
pnpm install
```

## 本地配置

本地 Worker 需要 `worker/.dev.vars` 提供密钥。推荐自动生成随机本地密钥：

```bash
pnpm env:init
```

如果需要手动配置，也可以从 `worker/.dev.vars.example` 复制并按需修改：

```bash
cp worker/.dev.vars.example worker/.dev.vars
```

常用变量：

- `JWT_SECRET`
- `CODE_HMAC_SECRET`
- `APP_SECRET_HMAC_SECRET`
- `DEVICE_HMAC_SECRET`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

运行时会校验核心加密密钥是否存在且没有使用示例占位值。`ADMIN_BOOTSTRAP_USERNAME` 和 `ADMIN_BOOTSTRAP_PASSWORD` 必须成对配置；`ADMIN_BOOTSTRAP_PASSWORD` 除首次初始化外，也用于本地忘记管理员密码时的恢复密钥。

`worker/.dev.vars` 不得提交。

`worker/wrangler.toml` 顶层配置用于本地开发：

- 顶层 `[vars]` 提供本地 `ADMIN_BOOTSTRAP_USERNAME`。
- 顶层 `[[d1_databases]]` 用于本地 D1，`database_id` 可以保持占位值。
- 生产环境配置放在本地私有 `worker/wrangler.production.toml`，本地开发命令不会读取。
- `worker/wrangler.production.example.toml` 是可提交的生产配置模板；`worker/wrangler.production.toml` 包含真实域名和生产 D1，不得提交。

## 本地启动

初始化本地 D1：

```bash
pnpm db:migrate:local
```

启动 Worker 和后台：

```bash
pnpm dev
```

根目录 `pnpm dev` 会同时启动 Worker 和 Vite 开发服务器。开发后台时访问 `http://localhost:5173`，前端支持 Vite 热更新，`/api/*` 请求会代理到本地 Worker `http://localhost:8787`。

如需验证 Worker 静态资源托管效果，先执行 `pnpm build` 生成 `admin/dist`，再单独启动 Worker：

```bash
pnpm --filter @license-manager/worker dev
```

如只开发前端，可单独启动 Vite：

```bash
pnpm --filter @license-manager/admin dev
```

如只开发 Worker，可单独启动 Wrangler：

```bash
pnpm --filter @license-manager/worker dev
```

## 常用命令

根目录：

```bash
pnpm build
pnpm build:production
pnpm type-check
pnpm test
pnpm db:migrate:local
pnpm db:migrate:remote
pnpm env:init
pnpm env:check:production
```

Worker：

```bash
pnpm --filter @license-manager/worker build
pnpm --filter @license-manager/worker build:production
pnpm --filter @license-manager/worker type-check
pnpm --filter @license-manager/worker test
```

`pnpm db:migrate:remote`、`pnpm build:production` 和 `pnpm deploy` 会使用 Wrangler `production` 环境。

Admin：

```bash
pnpm --filter @license-manager/admin build
pnpm --filter @license-manager/admin type-check
```

## 验证策略

验证目标不是“命令通过”本身，而是证明本次变化的契约仍成立。先运行最小相关集合；涉及共享类型、构建链或部署时再扩大到工作区级验证。

后端业务或数据库访问变更至少运行：

```bash
pnpm --filter @license-manager/worker type-check
pnpm --filter @license-manager/worker test
```

前端变更至少运行：

```bash
pnpm --filter @license-manager/admin type-check
```

跨项目、构建、部署相关变更运行：

```bash
pnpm type-check
pnpm build
```

数据库迁移变更还应本地应用迁移：

```bash
pnpm db:migrate:local
```

纯文档变更可以不运行测试，但需要在提交或交付说明中写明原因。

### 测试职责

| 测试文件 | 主要覆盖 | 变化时重点检查 |
| --- | --- | --- |
| `worker/test/config.test.ts` | 环境变量存在性、占位值和 bootstrap 配对 | 新增 bindings、secret 或环境校验 |
| `worker/test/crypto.test.ts` | HMAC、激活码格式、密码哈希、JWT | 加密格式、密钥用途或 token 行为 |
| `worker/test/time.test.ts` | 天、自然月、自然年和过期边界 | 套餐时长或时区/到期语义 |
| `worker/test/service.test.ts` | 业务状态流转、错误码、日志和敏感字段 | 激活、校验、解绑、应用和管理员规则 |
| `worker/test/repository.test.ts` | SQL 绑定、条件更新、筛选和聚合 | schema、查询、分页、并发前置条件 |
| `admin/src/i18n/*.test.ts` | 语言选择和 i18n 核心逻辑 | 语言策略或翻译加载 |
| `admin/src/shared/licenseDocs.test.ts` | 接入文档示例生成 | 客户端 API 和文档示例 |
| `admin/src/shared/licenseSdks.test.ts` | SDK 示例生成 | SDK 模板、端点或参数 |

根目录 `pnpm test` 当前只运行 Worker Vitest。Admin 的 `*.test.ts` 使用 `node:test`，未接入统一 package script，且被前端 `tsconfig` 排除；修改这些模块时必须显式执行兼容当前 Node 版本的测试命令，或在交付说明中明确该测试缺口，不能把 `pnpm test` 视为已覆盖前端测试。

行为变更的测试至少覆盖：

- 一个成功路径。
- 直接相关的拒绝路径和稳定错误码。
- 状态边界，例如到期时刻、次数上限和空绑定。
- 会覆盖他人状态的写操作所需并发/条件更新结果。
- 敏感字段不进入返回值或日志。

不要用宽泛快照代替业务断言，也不要为了让测试通过而放宽生产规则。

### 纯文档校验

纯文档变更至少人工或通过仓库搜索确认：

- 文档引用的文件路径真实存在。
- `package.json` 中存在所列脚本。
- API 路径与 `worker/src/routes.ts` 一致。
- 状态、动作和错误码与 `worker/src/constants.ts` 一致。
- 数据表、字段和迁移与 `migrations/` 一致。

## 开发流程

修改前：

- 先确认影响范围：后端、前端、数据库、部署或文档。
- 先读根目录 `AGENTS.md`，再按任务路由阅读必要主题文档。
- 定位主题的代码事实源，不凭记忆修改接口和业务规则。
- 对已有未提交改动保持谨慎，不覆盖无关变更。
- 发现文档与实现冲突时先决定预期，并把消除冲突纳入任务范围。

修改时：

- 保持改动集中，不做无关重构。
- 优先复用已有类型、函数、错误码和响应结构。
- 新增业务规则时同步考虑日志、测试和前端展示。
- 涉及数据库字段时同步更新类型、查询、迁移和文档。
- 涉及接口返回结构时同步更新前端类型和调用方。
- 需要并发保护的状态更新把前置条件写入 repository SQL，不只在 service 中先读后写。

修改后：

- 按影响范围运行验证命令。
- 对照 `AGENTS.md` 的完成定义检查跨层契约和敏感数据。
- 在最终说明中概括改动范围和验证结果。
- 未运行测试时说明原因。
