# 授权管理系统

[English](README.md) | 简体中文

轻量、可自托管的激活码授权管理系统，面向独立软件、桌面工具、插件、脚本工具、内部系统等需要“发码、激活、校验、换机、停用、审计”的场景。

项目基于 Cloudflare Workers + D1 构建后端和数据库，使用 Hono 提供 API，管理后台由 React + Vite + Ant Design Pro 实现。Worker 同时托管后端接口和管理后台静态资源，适合以较低运维成本部署到 Cloudflare 边缘网络。

## 适用场景

- 为一个或多个应用发放激活码。
- 按平台区分授权，例如 Windows、macOS、Linux、iOS、Android 或 Web。
- 需要客户端通过 `app_id`、`app_secret`、激活码和设备指纹完成激活与校验。
- 需要支持“一码一机”，同时允许受控的自助换机。
- 需要管理后台查看授权状态、筛选激活码、处理禁用/启用/删除和查看操作日志。
- 需要避免保存完整明文激活码、应用密钥和设备指纹。

## 功能

### 授权管理

- 多应用、多平台授权管理。
- 应用支持启用、禁用、删除和密钥更换。
- 应用密钥只在创建或更换时展示一次，数据库保存 HMAC 哈希。

### 激活码

- 批量生成激活码，单次生成数量由服务端限制。
- 内置周卡、月卡、季卡、年卡四类套餐。
- 激活码明文只在生成响应中展示一次，数据库不保存完整明文。
- 支持按状态、应用、平台、套餐、关键字等条件筛选。
- 支持禁用、启用、软删除和批量操作。

### 激活、校验与换机

- 首次激活时才计算过期时间，而不是从生成时间开始计时。
- 周卡按 7 天计算；月卡、季卡、年卡按自然月或自然年计算。
- 默认一码一机，校验时要求设备指纹匹配。
- 同一设备重复激活同一激活码会返回当前授权信息。
- 支持最多 3 次自助解绑迁移，相邻两次有效解绑至少间隔 24 小时。
- 管理员可以在后台手动解绑符合条件的已激活授权。

### 管理后台

- 管理员登录、会话鉴权和密码修改。
- 应用列表、应用创建、禁用、启用、删除和密钥重置。
- 激活码生成、列表筛选、授权详情和批量操作。
- 操作日志查询，用于追踪关键管理行为。

### 安全与审计

- `/api/admin/*` 除登录外使用 Bearer Token 鉴权。
- 客户端接口校验 `app_id` 和 `app_secret`。
- 激活码、应用密钥和设备指纹均使用 HMAC 哈希后存储。
- API 统一返回结构，不向客户端暴露 SQL 错误、裸异常或密钥信息。
- 删除激活码采用软删除，便于审计和避免破坏历史记录。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 后端 | Cloudflare Workers、Hono、TypeScript |
| 数据库 | Cloudflare D1、SQL migration |
| 管理后台 | React、Vite、Ant Design Pro |
| 包管理 | pnpm workspace |
| 部署 | Wrangler、Worker assets |
| 测试 | Vitest |

## 项目结构

```text
.
├── admin/        # React + Vite + Ant Design Pro 管理后台
├── docs/         # 架构、API、业务规则、安全、部署等文档
├── migrations/   # Cloudflare D1 migration
├── worker/       # Cloudflare Workers + Hono API
├── AGENTS.md     # 编码 Agent 开发规范
└── pnpm-workspace.yaml
```

请求流概览：

```text
Browser/Admin
  -> Cloudflare Worker
  -> Hono routes
  -> service business rules
  -> repository D1 queries
  -> unified JSON response
```

非 `/api/*` 请求由 Worker assets 回退到管理后台静态资源。

## 本地开发

环境要求：

- Node.js `>=20.11.0`
- pnpm `>=11.7.0`
- Cloudflare Wrangler，由 `worker/package.json` 管理

安装依赖并准备本地密钥：

```bash
pnpm install
pnpm env:init
```

初始化本地 D1 并启动开发环境：

```bash
pnpm db:migrate:local
pnpm dev
```

开发后台访问 `http://localhost:5173`，前端由 Vite 提供热更新，接口请求代理到本地 Worker。

本地 Worker 默认监听 `http://localhost:8787`。如需验证 Worker 静态资源托管效果，可以先执行 `pnpm build`，再单独启动 Worker。

默认 bootstrap 管理员由 `worker/.dev.vars` 和 `worker/wrangler.toml` 控制：

- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

首次登录时如果管理员不存在，Worker 会自动创建。

本地开发读取公开的 `worker/wrangler.toml` 顶层配置。生产部署读取不提交的 `worker/wrangler.production.toml`，并通过 `wrangler secret put --config wrangler.production.toml --env production` 管理密钥。

## 常用命令

```bash
pnpm dev               # 同时启动 Worker 和管理后台
pnpm env:init          # 生成本地 Worker 密钥
pnpm env:check:production # 检查生产 secret 名称
pnpm build             # 构建管理后台和 Worker
pnpm type-check        # 运行前后端类型检查
pnpm test              # 运行 Worker 测试
pnpm db:migrate:local  # 应用本地 D1 迁移
pnpm db:migrate:remote # 应用生产 D1 迁移
pnpm deploy            # 构建并部署生产 Worker
```

## 验证

```bash
pnpm build
pnpm type-check
pnpm test
```

纯文档修改通常不需要运行测试；代码、接口、数据库或部署流程变更应按影响范围运行对应验证命令。

## 部署

部署目标为 Cloudflare Workers + D1 + Worker assets。

首次部署前需要：

1. 创建生产 D1 数据库。
2. 从 `worker/wrangler.production.example.toml` 复制生成本地私有 `worker/wrangler.production.toml`。
3. 在生产配置中填写 Worker 名称、自定义域名、生产 D1 `database_id` 和 bootstrap 用户名。
4. 使用 Wrangler secrets 写入 `JWT_SECRET`、`CODE_HMAC_SECRET`、`APP_SECRET_HMAC_SECRET`、`DEVICE_HMAC_SECRET` 和 `ADMIN_BOOTSTRAP_PASSWORD`。
5. 检查生产 secret 名称。
6. 执行远程 D1 migration。
7. 构建并部署。

```bash
pnpm env:check:production
pnpm db:migrate:remote
pnpm deploy
```

生产 D1、生产域名和 bootstrap 用户名配置在本地私有 `worker/wrangler.production.toml` 的 `env.production` 中，详见 [部署指南](docs/DEPLOYMENT.md)。

部署后建议检查：

- `/api/health` 返回正常。
- 管理后台能加载并完成登录。
- 应用创建后只展示一次 `app_secret`。
- 生成激活码后只展示一次明文 `codes`。
- 客户端激活、校验、解绑接口按预期返回。

## 开源与安全

- 本项目采用 [MIT License](LICENSE)。
- 贡献方式见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 漏洞报告方式见 [SECURITY.md](SECURITY.md)。
- 公开仓库不提交 `worker/.dev.vars`、`worker/wrangler.production.toml`、真实密钥、生产 D1 ID 或构建产物。
- 生产配置从 `worker/wrangler.production.example.toml` 复制为不提交的 `worker/wrangler.production.toml` 后再填写真实值。

## 文档

更详细的设计、接口和维护规则拆分在主题文档中：

- [文档索引](docs/README.md)
- [开发指南](docs/DEVELOPMENT.md)
- [架构说明](docs/ARCHITECTURE.md)
- [业务规则](docs/BUSINESS_RULES.md)
- [前端规范](docs/FRONTEND.md)
- [API 规范](docs/API.md)
- [安全规范](docs/SECURITY.md)
- [数据库规范](docs/DATABASE.md)
- [部署指南](docs/DEPLOYMENT.md)
