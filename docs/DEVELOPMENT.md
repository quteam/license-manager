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

## 开发流程

修改前：

- 先确认影响范围：后端、前端、数据库、部署或文档。
- 先阅读相关文件，不凭记忆修改接口和业务规则。
- 前端变更阅读 `docs/FRONTEND.md`，Agent 执行规范阅读根目录 `AGENTS.md`。
- 对已有未提交改动保持谨慎，不覆盖无关变更。

修改时：

- 保持改动集中，不做无关重构。
- 优先复用已有类型、函数、错误码和响应结构。
- 新增业务规则时同步考虑日志、测试和前端展示。
- 涉及数据库字段时同步更新类型、查询、迁移和文档。
- 涉及接口返回结构时同步更新前端类型和调用方。

修改后：

- 按影响范围运行验证命令。
- 在最终说明中列出改动文件和验证结果。
- 未运行测试时说明原因。
